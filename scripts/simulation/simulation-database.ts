import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "../../src/generated/prisma/client";
import {
  SIMULATION_DEVICE_EXTERNAL_ID,
  SIMULATION_REFERENCE_PREFIX,
} from "./simulation-data";

export function assertSimulationEnvironment(): void {
  if (process.env.APP_MODE !== "demo") {
    throw new Error("A simulação só pode ser executada com APP_MODE=demo.");
  }
  if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
    throw new Error("A simulação é bloqueada em ambiente de produção.");
  }
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL não está definida.");
  }
}

function normalizeAdministrativeUrl(connectionString: string): string {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");
  if (["prefer", "require", "verify-ca"].includes(sslMode ?? "")) {
    url.searchParams.set("sslmode", "verify-full");
  }
  return url.toString();
}

export function createSimulationPrisma(): PrismaClient {
  assertSimulationEnvironment();
  const configuredUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (!configuredUrl) throw new Error("Conexão administrativa do banco não encontrada.");
  if (configuredUrl.startsWith("prisma+postgres://")) {
    throw new Error("Defina DIRECT_DATABASE_URL para executar a manutenção restrita da simulação.");
  }
  return new PrismaClient({ adapter: new PrismaPg(normalizeAdministrativeUrl(configuredUrl)) });
}

export type SimulationCounts = {
  patients: number;
  triages: number;
  analyses: number;
  readings: number;
};

export async function getSimulationCounts(prisma: PrismaClient): Promise<SimulationCounts> {
  const patients = await prisma.patient.findMany({
    where: { documentReference: { startsWith: SIMULATION_REFERENCE_PREFIX } },
    select: { id: true, triages: { select: { id: true } } },
  });
  const triageIds = patients.flatMap((patient) => patient.triages.map((triage) => triage.id));
  const device = await prisma.medicalDevice.findUnique({
    where: { externalIdentifier: SIMULATION_DEVICE_EXTERNAL_ID },
    select: { id: true },
  });
  const [analyses, readings] = await Promise.all([
    triageIds.length ? prisma.analysisRun.count({ where: { triageId: { in: triageIds } } }) : 0,
    device ? prisma.reading.count({ where: { deviceId: device.id } }) : 0,
  ]);
  return { patients: patients.length, triages: triageIds.length, analyses, readings };
}

export async function cleanSimulationData(prisma: PrismaClient): Promise<SimulationCounts> {
  return prisma.$transaction(async (transaction) => {
    const patients = await transaction.patient.findMany({
      where: { documentReference: { startsWith: SIMULATION_REFERENCE_PREFIX } },
      select: { id: true, documentReference: true, triages: { select: { id: true } } },
    });
    if (patients.some((patient) => !patient.documentReference?.startsWith(SIMULATION_REFERENCE_PREFIX))) {
      throw new Error("A seleção de limpeza incluiu um paciente fora do lote experimental.");
    }

    const patientIds = patients.map((patient) => patient.id);
    const triageIds = patients.flatMap((patient) => patient.triages.map((triage) => triage.id));
    const device = await transaction.medicalDevice.findUnique({
      where: { externalIdentifier: SIMULATION_DEVICE_EXTERNAL_ID },
      select: { id: true },
    });
    const deviceSessionIds = device
      ? (await transaction.deviceCollectionSession.findMany({ where: { deviceId: device.id }, select: { id: true } })).map((item) => item.id)
      : [];
    const readingIds = device
      ? (await transaction.reading.findMany({ where: { deviceId: device.id }, select: { id: true } })).map((item) => item.id)
      : [];
    const collectionSessionIds = triageIds.length
      ? (await transaction.hardwareCollectionSession.findMany({ where: { triageId: { in: triageIds } }, select: { id: true } })).map((item) => item.id)
      : [];
    const analysisRunIds = triageIds.length
      ? (await transaction.analysisRun.findMany({ where: { triageId: { in: triageIds } }, select: { id: true } })).map((item) => item.id)
      : [];
    const recommendationIds = analysisRunIds.length
      ? (await transaction.analysisRecommendation.findMany({ where: { analysisRunId: { in: analysisRunIds } }, select: { id: true } })).map((item) => item.id)
      : [];
    const anamnesisIds = triageIds.length
      ? (await transaction.anamnesis.findMany({ where: { triageId: { in: triageIds } }, select: { id: true } })).map((item) => item.id)
      : [];

    const counts: SimulationCounts = {
      patients: patientIds.length,
      triages: triageIds.length,
      analyses: analysisRunIds.length,
      readings: readingIds.length,
    };

    if (!patientIds.length && !device) return counts;

    await transaction.$executeRawUnsafe('ALTER TABLE "AuditEvent" DISABLE TRIGGER "AuditEvent_append_only"');
    try {
      const auditedEntityIds = [...triageIds, ...deviceSessionIds, ...readingIds, ...collectionSessionIds, ...analysisRunIds];
      await transaction.auditEvent.deleteMany({
        where: {
          OR: [
            ...(triageIds.length ? [{ triageId: { in: triageIds } }] : []),
            ...(auditedEntityIds.length ? [{ entityId: { in: auditedEntityIds } }] : []),
            ...(device ? [{ actorReference: device.id }] : []),
          ],
        },
      });
      if (triageIds.length) {
        await transaction.careAttendance.deleteMany({ where: { triageId: { in: triageIds } } });
        await transaction.careReferral.deleteMany({ where: { triageId: { in: triageIds } } });
        await transaction.nurseReview.deleteMany({ where: { triageId: { in: triageIds } } });
      }
      if (recommendationIds.length) await transaction.recommendationReason.deleteMany({ where: { recommendationId: { in: recommendationIds } } });
      if (analysisRunIds.length) {
        await transaction.analysisRecommendation.deleteMany({ where: { analysisRunId: { in: analysisRunIds } } });
        await transaction.analysisRun.deleteMany({ where: { id: { in: analysisRunIds } } });
      }
      if (collectionSessionIds.length) {
        await transaction.vitalSignMeasurement.deleteMany({ where: { collectionSessionId: { in: collectionSessionIds } } });
        await transaction.hardwareError.deleteMany({ where: { collectionSessionId: { in: collectionSessionIds } } });
        await transaction.hardwareCollectionSession.deleteMany({ where: { id: { in: collectionSessionIds } } });
      }
      if (triageIds.length) {
        await transaction.queueTicket.deleteMany({ where: { triageId: { in: triageIds } } });
        await transaction.redFlagOccurrence.deleteMany({ where: { triageId: { in: triageIds } } });
      }
      if (anamnesisIds.length) {
        await transaction.anamnesisAnswer.deleteMany({ where: { anamnesisId: { in: anamnesisIds } } });
        await transaction.anamnesis.deleteMany({ where: { id: { in: anamnesisIds } } });
      }
      if (triageIds.length) {
        await transaction.consentRecord.deleteMany({ where: { triageId: { in: triageIds } } });
      }
      if (device) {
        await transaction.reading.deleteMany({ where: { deviceId: device.id } });
        await transaction.deviceCollectionSession.deleteMany({ where: { deviceId: device.id } });
      }
      if (triageIds.length) await transaction.triage.deleteMany({ where: { id: { in: triageIds } } });
      if (patientIds.length) {
        await transaction.consentRecord.deleteMany({ where: { patientId: { in: patientIds } } });
        await transaction.healthPlanInformation.deleteMany({ where: { patientId: { in: patientIds } } });
        await transaction.patient.deleteMany({ where: { id: { in: patientIds } } });
      }
      if (device) {
        await transaction.deviceCapability.deleteMany({ where: { deviceId: device.id } });
        await transaction.medicalDevice.delete({ where: { id: device.id } });
      }
    } finally {
      await transaction.$executeRawUnsafe('ALTER TABLE "AuditEvent" ENABLE TRIGGER "AuditEvent_append_only"');
    }
    return counts;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, maxWait: 10_000, timeout: 120_000 });
}

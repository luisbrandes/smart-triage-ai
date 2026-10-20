import "dotenv/config";

import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { demoAnamnesis } from "../src/demo/anamnesis";
import { demoConsent } from "../src/demo/consent";
import { demoFinalAnalysisRuleSet } from "../src/demo/analysis-rules";
import { runDeterministicFinalAnalysis } from "../src/domain/analysis/analysis-engine";
import type { NormalizedAnalysisInput } from "../src/domain/analysis/analysis-types";
import { deviceReadingSchema } from "../src/server/application/device-readings/reading-validation";
import {
  cleanSimulationData,
  createSimulationPrisma,
  getSimulationCounts,
} from "./simulation/simulation-database";
import {
  expectedPriorityFromCurrentDemoRules,
  SIMULATION_DEVICE_EXTERNAL_ID,
  SIMULATION_DEVICE_ID,
  SIMULATION_REFERENCE_PREFIX,
  SIMULATION_VERSION,
  simulationArrivalAt,
  simulationCases,
  simulationPatients,
  type SimulationCase,
} from "./simulation/simulation-data";

const RESULT_PATH = path.resolve("artifacts", "simulation", "observed-results.json");
const SIMULATION_ACTOR = "DEMO_SIMULATION_REVIEWER";

function alertAnswers(item: SimulationCase): Record<string, "yes" | "no"> {
  return {
    DEMO_ALERT_SUDDEN_CHANGE: item.alerts.suddenChange,
    DEMO_ALERT_BREATHING: item.alerts.breathing,
    DEMO_ALERT_CONSCIOUSNESS: item.alerts.consciousness,
  };
}

function analysisFingerprint(input: NormalizedAnalysisInput): string {
  return createHash("sha256")
    .update(JSON.stringify({ ...input, ruleSetVersion: demoFinalAnalysisRuleSet.version }))
    .digest("hex");
}

async function main(): Promise<void> {
  const maintenancePrisma = createSimulationPrisma();
  const {
    PrismaDeviceCollectionSessionRepository,
  } = await import("../src/server/repositories/prisma-device-collection-session-repository");
  const { PrismaDeviceReadingRepository } = await import("../src/server/repositories/prisma-device-reading-repository");
  const { PrismaVitalSignsRepository } = await import("../src/server/repositories/prisma-vital-signs-repository");
  const { PrismaNursingQueueRepository } = await import("../src/server/repositories/prisma-nursing-queue-repository");
  const {
    startDeviceCollectionSession,
    releaseDeviceCollectionSession,
  } = await import("../src/server/application/device-collection-sessions/device-collection-session-use-cases");
  const { recordDeviceReading } = await import("../src/server/application/device-readings/record-device-reading");
  const { acceptPhysicalDeviceCollectionForTriage } = await import("../src/server/application/vital-signs/accept-physical-device-collection");
  const {
    listNursingQueue,
    getNursingTriageDetail,
    listCareQueue,
  } = await import("../src/server/application/nursing/nursing-queries");
  const {
    confirmTriageClassification,
    referTriageToCare,
    callNextPatient,
    startPatientCare,
    completePatientCare,
  } = await import("../src/server/application/nursing/nursing-mutations");
  const { prisma } = await import("../src/server/db/prisma");

  const sessionRepository = new PrismaDeviceCollectionSessionRepository();
  const readingRepository = new PrismaDeviceReadingRepository();
  const vitalSignsRepository = new PrismaVitalSignsRepository();
  const nursingRepository = new PrismaNursingQueueRepository();

  try {
    const existing = await getSimulationCounts(maintenancePrisma);
    const isComplete = existing.patients === 10 && existing.triages === 50 && existing.analyses === 50 && existing.readings === 50;
    if (Object.values(existing).some((count) => count > 0) && !isComplete) {
      throw new Error("Foi encontrado um lote experimental parcial. Execute npm run simulation:clean e tente novamente.");
    }
    if (isComplete) {
      console.info("O lote experimental completo já existe; nenhuma duplicação foi criada.");
      return;
    }

    await cleanSimulationData(maintenancePrisma);
    await prisma.medicalDevice.upsert({
      where: { id: SIMULATION_DEVICE_ID },
      update: { isActive: true, operationalStatus: "AVAILABLE" },
      create: {
        id: SIMULATION_DEVICE_ID,
        externalIdentifier: SIMULATION_DEVICE_EXTERNAL_ID,
        displayName: "ESP32 sintético do experimento controlado",
        manufacturer: "DEMO",
        model: "SIMULATION-ONLY",
        operationalStatus: "AVAILABLE",
        isActive: true,
      },
    });

    for (const patient of simulationPatients) {
      const createdAt = simulationArrivalAt(simulationCases.find((item) => item.patientKey === patient.key)!);
      await prisma.patient.create({
        data: {
          id: patient.id,
          displayName: patient.displayName,
          birthDate: new Date(`${patient.birthDate}T00:00:00.000Z`),
          sex: patient.sex,
          documentReference: patient.documentReference,
          createdAt,
          healthPlans: {
            create: {
              hasHealthPlan: patient.hasHealthPlan,
              planName: patient.hasHealthPlan ? patient.planName : null,
              createdAt,
            },
          },
        },
      });
    }

    const initialObserved: Array<Record<string, unknown>> = [];
    for (const item of simulationCases) {
      const patient = simulationPatients.find((candidate) => candidate.key === item.patientKey);
      if (!patient) throw new Error(`Paciente não encontrado para ${item.key}.`);
      const arrivalAt = simulationArrivalAt(item);
      const analysisAt = new Date(arrivalAt.getTime() + 2 * 60_000);
      const answers = alertAnswers(item);

      await prisma.$transaction(async (transaction) => {
        const triage = await transaction.triage.create({
          data: {
            id: item.triageId,
            patientId: patient.id,
            status: "VITAL_SIGNS_REQUIRED",
            startedAt: arrivalAt,
            createdAt: arrivalAt,
          },
        });
        await transaction.consentRecord.create({
          data: {
            patientId: patient.id,
            triageId: triage.id,
            termsVersion: demoConsent.version,
            acceptedAt: arrivalAt,
            acceptanceOrigin: "DEMO_CONTROLLED_SIMULATION",
            status: "ACCEPTED",
            createdAt: arrivalAt,
          },
        });
        const anamnesis = await transaction.anamnesis.create({
          data: {
            triageId: triage.id,
            version: 1,
            mainComplaint: item.mainComplaint,
            additionalDescription: item.additionalDescription,
            subjectiveIntensity: item.subjectiveIntensity,
            approximateDuration: item.approximateDuration,
            declaredAllergies: item.declaredAllergies ?? "Nenhuma alergia declarada no cenário fictício.",
            declaredMedications: item.declaredMedications ?? "Nenhum medicamento declarado no cenário fictício.",
            declaredPreexistingConditions: item.declaredPreexistingConditions ?? "Nenhuma condição preexistente declarada no cenário fictício.",
            createdAt: arrivalAt,
            answers: {
              create: Object.entries(answers).map(([questionKey, normalizedValue]) => ({
                questionKey,
                questionVersion: demoAnamnesis.version,
                normalizedValue,
                createdAt: arrivalAt,
              })),
            },
          },
        });
        await transaction.auditEvent.createMany({
          data: [
            { triageId: triage.id, entityType: "Triage", entityId: triage.id, action: "TRIAGE_STARTED", actorType: "DEMO_OPERATOR", actorReference: SIMULATION_ACTOR, sanitizedMetadata: { simulationVersion: SIMULATION_VERSION }, createdAt: arrivalAt },
            { triageId: triage.id, entityType: "Triage", entityId: triage.id, action: "IDENTIFICATION_SAVED", actorType: "DEMO_OPERATOR", actorReference: SIMULATION_ACTOR, sanitizedMetadata: { simulationVersion: SIMULATION_VERSION }, createdAt: arrivalAt },
            { triageId: triage.id, entityType: "ConsentRecord", entityId: triage.id, action: "CONSENT_ACCEPTED", actorType: "DEMO_OPERATOR", actorReference: SIMULATION_ACTOR, sanitizedMetadata: { termsVersion: demoConsent.version, simulationVersion: SIMULATION_VERSION }, createdAt: arrivalAt },
            { triageId: triage.id, entityType: "Anamnesis", entityId: anamnesis.id, action: "ANAMNESIS_SAVED", actorType: "DEMO_OPERATOR", actorReference: SIMULATION_ACTOR, sanitizedMetadata: { catalogVersion: demoAnamnesis.version, answerCount: 3, simulationVersion: SIMULATION_VERSION }, createdAt: arrivalAt },
            { triageId: triage.id, entityType: "Triage", entityId: triage.id, action: "ANAMNESIS_COMPLETED", actorType: "DEMO_OPERATOR", actorReference: SIMULATION_ACTOR, sanitizedMetadata: { simulationVersion: SIMULATION_VERSION }, createdAt: arrivalAt },
          ],
        });
      });

      const technicalSession = await startDeviceCollectionSession(sessionRepository, SIMULATION_DEVICE_EXTERNAL_ID, item.triageId);
      const validatedReading = deviceReadingSchema.parse({
        deviceId: SIMULATION_DEVICE_EXTERNAL_ID,
        sessionId: technicalSession.sessionId,
        readingId: randomUUID(),
        ...item.vitals,
      });
      const recorded = await recordDeviceReading(readingRepository, validatedReading);
      await releaseDeviceCollectionSession(sessionRepository, SIMULATION_DEVICE_EXTERNAL_ID);
      const accepted = await acceptPhysicalDeviceCollectionForTriage(vitalSignsRepository, item.triageId, {
        deviceCollectionSessionId: technicalSession.sessionId,
        readingId: recorded.readingId,
      });
      const analysis = await vitalSignsRepository.completeAndAnalyze({
        triageId: item.triageId,
        ruleSetVersion: demoFinalAnalysisRuleSet.version,
        ruleSetDescription: demoFinalAnalysisRuleSet.description,
        evaluate: (input) => ({
          fingerprint: analysisFingerprint(input),
          result: runDeterministicFinalAnalysis(input, demoFinalAnalysisRuleSet, analysisAt),
        }),
      });
      initialObserved.push({
        caseKey: item.key,
        triageId: item.triageId,
        readingId: recorded.readingId,
        collectionSessionId: accepted.collectionSessionId,
        analysisRunId: analysis.analysisRunId,
        observedPriority: analysis.recommendedPriority,
        reasons: analysis.reasons,
      });
    }

    const observationAt = new Date(simulationArrivalAt(simulationCases.at(-1)!).getTime() + 30 * 60_000);
    const initialQueue = await listNursingQueue(nursingRepository, observationAt);
    const initialDetails = await Promise.all(simulationCases.map(async (item) => ({
      caseKey: item.key,
      detail: await getNursingTriageDetail(nursingRepository, item.triageId, observationAt),
    })));
    if (initialQueue.items.length !== 50 || initialDetails.some((item) => !item.detail)) {
      throw new Error("A projeção usada pelo frontend não conseguiu visualizar todas as 50 triagens.");
    }

    const careCases = [3, 6, 2, 5, 1, 4].map((sequence) => simulationCases[sequence - 1]);
    for (const item of careCases) {
      await confirmTriageClassification(nursingRepository, item.triageId, SIMULATION_ACTOR);
      const referral = await referTriageToCare(nursingRepository, item.triageId, {
        destination: "Atendimento demonstrativo",
        notes: "Encaminhamento sintético do experimento controlado.",
      }, SIMULATION_ACTOR);
      if (!referral.success) throw new Error("Não foi possível encaminhar um caso sintético à fila de atendimento.");
    }
    const careQueueBeforeCall = await listCareQueue(nursingRepository, observationAt);
    const firstCalled = await callNextPatient(nursingRepository, SIMULATION_ACTOR);
    if (!firstCalled.success || firstCalled.status !== "CALLED" || !firstCalled.ticketCode) {
      throw new Error("A fila de atendimento não chamou o primeiro caso esperado.");
    }
    const firstCalledCase = careCases.find((item) => item.triageId === careQueueBeforeCall.find((entry) => entry.ticketCode === firstCalled.ticketCode)?.triageId);
    if (!firstCalledCase) throw new Error("A chamada não corresponde a um caso controlado.");
    await startPatientCare(nursingRepository, firstCalledCase.triageId, SIMULATION_ACTOR);
    await completePatientCare(nursingRepository, firstCalledCase.triageId, SIMULATION_ACTOR);
    const secondCalled = await callNextPatient(nursingRepository, SIMULATION_ACTOR);

    const [finalReviewQueue, finalCareQueue, persisted] = await Promise.all([
      listNursingQueue(nursingRepository, observationAt),
      listCareQueue(nursingRepository, observationAt),
      prisma.triage.findMany({
        where: { patient: { documentReference: { startsWith: SIMULATION_REFERENCE_PREFIX } } },
        orderBy: { startedAt: "asc" },
        select: {
          id: true,
          status: true,
          startedAt: true,
          currentRecommendedPriority: true,
          finalHumanPriority: true,
          patient: { select: { id: true, displayName: true, documentReference: true } },
          queueTicket: { select: { publicCode: true, issuedAt: true, sequenceNumber: true, status: true } },
          analysisRuns: { orderBy: { completedAt: "asc" }, select: { completedAt: true, ruleSetVersion: { select: { version: true } }, recommendation: { select: { recommendedPriority: true, reasons: { orderBy: { displayOrder: "asc" }, select: { reasonCode: true, explanation: true, category: true } } } } } },
          collectionSessions: { orderBy: { attemptNumber: "asc" }, select: { id: true, origin: true, status: true, attemptNumber: true, sourceDeviceCollectionSessionId: true, measurements: { orderBy: { sequenceNumber: "asc" }, select: { vitalSignType: true, numericValue: true, unit: true, technicalStatus: true } } } },
          requestedDeviceCollectionSessions: { orderBy: { createdAt: "asc" }, select: { id: true, status: true, readings: { orderBy: { receivedAt: "asc" }, select: { id: true, heartRate: true, spo2: true, temperature: true, receivedAt: true } } } },
          careAttendance: { select: { status: true, queuedAt: true, calledAt: true, serviceStartedAt: true, completedAt: true } },
        },
      }),
    ]);

    const rankByTriage = new Map(initialQueue.items.map((item, index) => [item.triageId, index + 1]));
    const observedByTriage = new Map(initialObserved.map((item) => [item.triageId, item]));
    const records = simulationCases.map((item) => {
      const stored = persisted.find((candidate) => candidate.id === item.triageId);
      const observed = observedByTriage.get(item.triageId);
      if (!stored || !observed) throw new Error(`Resultado persistido ausente para ${item.key}.`);
      return {
        ...item,
        arrivalAt: simulationArrivalAt(item),
        expectedByIndependentRuleReading: expectedPriorityFromCurrentDemoRules(item),
        observedPriority: observed.observedPriority,
        agreement: item.expectedPriority === observed.observedPriority,
        initialReviewQueuePosition: rankByTriage.get(item.triageId),
        technicalReading: stored.requestedDeviceCollectionSessions.flatMap((session) => session.readings).at(0) ?? null,
        persistedStatus: stored.status,
        finalHumanPriority: stored.finalHumanPriority,
        ticket: stored.queueTicket,
        collectionSessions: stored.collectionSessions,
        analyses: stored.analysisRuns,
        careAttendance: stored.careAttendance,
      };
    });

    const payload = {
      metadata: {
        simulationVersion: SIMULATION_VERSION,
        generatedAt: new Date(),
        dataPolicy: "Dados integralmente sintéticos; sem validade clínica.",
        ruleSetVersion: demoFinalAnalysisRuleSet.version,
        totalPatients: simulationPatients.length,
        totalTriages: records.length,
        initialQueueVisibleCount: initialQueue.items.length,
        finalReviewQueueVisibleCount: finalReviewQueue.items.length,
        finalCareQueueVisibleCount: finalCareQueue.length,
      },
      patients: simulationPatients,
      cases: records,
      applicationProjection: {
        initialReviewQueue: initialQueue,
        initialDetails,
        careQueueBeforeCall,
        firstCalled,
        secondCalled,
        finalReviewQueue,
        finalCareQueue,
      },
    };

    await mkdir(path.dirname(RESULT_PATH), { recursive: true });
    await writeFile(RESULT_PATH, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
    const agreementCount = records.filter((item) => item.agreement).length;
    console.info(`Simulação concluída: ${simulationPatients.length} pacientes, ${records.length} triagens e ${agreementCount}/${records.length} concordâncias com a especificação das regras atuais.`);
    console.info(`Evidência observada gravada em ${path.relative(process.cwd(), RESULT_PATH)}.`);
  } finally {
    await Promise.allSettled([maintenancePrisma.$disconnect(), prisma.$disconnect()]);
  }
}

main().catch((error: unknown) => {
  console.error("Não foi possível carregar a simulação controlada.");
  if (error instanceof Error) console.error(error.message);
  process.exitCode = 1;
});

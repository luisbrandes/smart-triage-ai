import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";

const databaseUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL não está definida para executar o seed.");
}

const prisma = databaseUrl.startsWith("prisma+postgres://")
  ? new PrismaClient({ accelerateUrl: databaseUrl })
  : new PrismaClient({ adapter: new PrismaPg(databaseUrl) });
const demoTime = new Date("2026-01-15T12:00:00.000Z");

const ids = {
  ruleSet: "00000000-0000-4000-8000-000000000001",
  device: "00000000-0000-4000-8000-000000000002",
  ingestionDevice: "00000000-0000-4000-8000-000000000003",
  patients: [
    "10000000-0000-4000-8000-000000000001",
    "10000000-0000-4000-8000-000000000002",
    "10000000-0000-4000-8000-000000000003",
    "10000000-0000-4000-8000-000000000004",
  ],
  triages: [
    "20000000-0000-4000-8000-000000000001",
    "20000000-0000-4000-8000-000000000002",
    "20000000-0000-4000-8000-000000000003",
    "20000000-0000-4000-8000-000000000004",
  ],
} as const;

async function seedFoundation() {
  await prisma.ruleSetVersion.upsert({
    where: { id: ids.ruleSet },
    update: {},
    create: {
      id: ids.ruleSet,
      stableKey: "DEMO_EXPERIMENTAL_RULESET",
      version: "V0-DEMO-1",
      description: "EXPERIMENTAL: estrutura demonstrativa sem regras ou validade clínica.",
      status: "EXPERIMENTAL",
      createdAt: demoTime,
    },
  });

  await prisma.medicalDevice.upsert({
    where: { id: ids.device },
    update: {},
    create: {
      id: ids.device,
      externalIdentifier: "SIMULATED-DEMO-DEVICE-001",
      displayName: "Dispositivo SIMULATED para demonstração",
      manufacturer: "DEMO",
      model: "EXPERIMENTAL-V0",
      operationalStatus: "AVAILABLE",
      isActive: true,
      createdAt: demoTime,
      capabilities: {
        create: [
          { id: "30000000-0000-4000-8000-000000000001", vitalSignType: "HEART_RATE", createdAt: demoTime },
          { id: "30000000-0000-4000-8000-000000000002", vitalSignType: "SPO2", createdAt: demoTime },
        ],
      },
    },
  });

  await prisma.medicalDevice.upsert({
    where: { id: ids.ingestionDevice },
    update: {},
    create: {
      id: ids.ingestionDevice,
      externalIdentifier: "ESP32-001",
      displayName: "ESP32 fictício para ingestão HTTP",
      manufacturer: "DEMO",
      model: "HTTP-INGESTION-POC",
      operationalStatus: "AVAILABLE",
      isActive: true,
      createdAt: demoTime,
    },
  });
}

async function seedPatientsAndTriages() {
  const scenarios = [
    { patientId: ids.patients[0], triageId: ids.triages[0], name: "Pessoa DEMO 01", status: "AWAITING_NURSE_REVIEW" as const, recommended: null },
    { patientId: ids.patients[1], triageId: ids.triages[1], name: "Pessoa SIMULATED 02", status: "AWAITING_NURSE_REVIEW" as const, recommended: "YELLOW" as const },
    { patientId: ids.patients[2], triageId: ids.triages[2], name: "Pessoa EXPERIMENTAL 03", status: "CLASSIFIED" as const, recommended: "YELLOW" as const, final: "GREEN" as const },
    { patientId: ids.patients[3], triageId: ids.triages[3], name: "Pessoa DEMO 04", status: "AWAITING_NURSE_REVIEW" as const, recommended: null },
  ];

  for (const [index, scenario] of scenarios.entries()) {
    await prisma.patient.upsert({
      where: { id: scenario.patientId },
      update: {},
      create: {
        id: scenario.patientId,
        displayName: scenario.name,
        documentReference: `DEMO-NOT-A-REAL-DOCUMENT-0${index + 1}`,
        createdAt: demoTime,
      },
    });

    await prisma.triage.upsert({
      where: { id: scenario.triageId },
      update: {},
      create: {
        id: scenario.triageId,
        patientId: scenario.patientId,
        status: scenario.status,
        startedAt: new Date(demoTime.getTime() + index * 60_000),
        currentRecommendedPriority: scenario.recommended,
        finalHumanPriority: "final" in scenario ? scenario.final : null,
        createdAt: demoTime,
      },
    });

    await prisma.consentRecord.upsert({
      where: { id: `40000000-0000-4000-8000-00000000000${index + 1}` },
      update: {},
      create: {
        id: `40000000-0000-4000-8000-00000000000${index + 1}`,
        patientId: scenario.patientId,
        triageId: scenario.triageId,
        termsVersion: "DEMO-TERMS-V0",
        acceptedAt: demoTime,
        acceptanceOrigin: "DEMO_SEED",
        status: "ACCEPTED",
        createdAt: demoTime,
      },
    });
  }
}

async function seedSimulatedRecommendation() {
  const sessionId = "50000000-0000-4000-8000-000000000001";
  const runId = "60000000-0000-4000-8000-000000000001";
  const recommendationId = "70000000-0000-4000-8000-000000000001";

  await prisma.hardwareCollectionSession.upsert({
    where: { id: sessionId },
    update: {},
    create: {
      id: sessionId,
      triageId: ids.triages[1],
      deviceId: ids.device,
      origin: "SIMULATED_DEVICE",
      status: "COMPLETED",
      attemptNumber: 1,
      initiatedBy: "DEMO_OPERATOR",
      startedAt: demoTime,
      completedAt: new Date("2026-01-15T12:01:00.000Z"),
      sanitizedMetadata: { fixture: "SIMULATED_DETERMINISTIC_NO_CLINICAL_VALIDITY" },
      createdAt: demoTime,
    },
  });

  const measurements = [
    { id: "51000000-0000-4000-8000-000000000001", type: "HEART_RATE" as const, numericValue: 80, unit: "bpm", sequenceNumber: 1 },
    { id: "51000000-0000-4000-8000-000000000002", type: "SPO2" as const, numericValue: 97, unit: "%", sequenceNumber: 2 },
  ];
  for (const measurement of measurements) {
    await prisma.vitalSignMeasurement.upsert({
      where: { id: measurement.id },
      update: {},
      create: {
        id: measurement.id,
        collectionSessionId: sessionId,
        vitalSignType: measurement.type,
        numericValue: measurement.numericValue,
        unit: measurement.unit,
        origin: "SIMULATED_DEVICE",
        technicalStatus: "ACCEPTED",
        qualityDescription: "SIMULATED DEMO; sem validade clínica",
        receivedByServerAt: demoTime,
        acceptedIntoFlowAt: demoTime,
        externalMeasurementId: `SIMULATED-MEASUREMENT-${measurement.sequenceNumber}`,
        sequenceNumber: measurement.sequenceNumber,
        createdAt: demoTime,
      },
    });
  }

  await prisma.analysisRun.upsert({
    where: { id: runId },
    update: {},
    create: {
      id: runId,
      triageId: ids.triages[1],
      ruleSetVersionId: ids.ruleSet,
      runType: "FINAL",
      status: "COMPLETED",
      inputFingerprint: "DEMO-SEED-POST-VITALS-001",
      startedAt: demoTime,
      completedAt: demoTime,
      sanitizedInputSnapshot: { fixture: "EXPERIMENTAL_STRUCTURE_ONLY", acceptedMeasurementCount: 2 },
      createdAt: demoTime,
    },
  });
  await prisma.analysisRecommendation.upsert({
    where: { id: recommendationId },
    update: {},
    create: {
      id: recommendationId,
      analysisRunId: runId,
      recommendedPriority: "YELLOW",
      requiresVitalSigns: true,
      createdAt: demoTime,
      reasons: {
        create: {
          id: "71000000-0000-4000-8000-000000000001",
          reasonCode: "DEMO_EXPERIMENTAL_STRUCTURE",
          explanation: "Justificativa estrutural fictícia; não representa regra clínica.",
          category: "DEMO",
          displayOrder: 1,
          createdAt: demoTime,
        },
      },
    },
  });
}

async function seedHumanReview() {
  const runId = "60000000-0000-4000-8000-000000000002";
  const recommendationId = "70000000-0000-4000-8000-000000000002";
  await prisma.analysisRun.upsert({
    where: { id: runId },
    update: {},
    create: {
      id: runId,
      triageId: ids.triages[2],
      ruleSetVersionId: ids.ruleSet,
      runType: "FINAL",
      status: "COMPLETED",
      inputFingerprint: "DEMO-SEED-FINAL-002",
      startedAt: demoTime,
      completedAt: demoTime,
      sanitizedInputSnapshot: { fixture: "DEMO_NO_IDENTIFIABLE_DATA" },
      createdAt: demoTime,
    },
  });
  await prisma.analysisRecommendation.upsert({
    where: { id: recommendationId },
    update: {},
    create: {
      id: recommendationId,
      analysisRunId: runId,
      recommendedPriority: "YELLOW",
      requiresVitalSigns: false,
      createdAt: demoTime,
    },
  });
  await prisma.nurseReview.upsert({
    where: { id: "80000000-0000-4000-8000-000000000001" },
    update: {},
    create: {
      id: "80000000-0000-4000-8000-000000000001",
      triageId: ids.triages[2],
      reviewedRecommendationId: recommendationId,
      confirmedPriority: "GREEN",
      decision: "RECLASSIFIED",
      justification: "DEMO: alteração fictícia para validar separação histórica; sem validade clínica.",
      reviewedAt: demoTime,
      professionalReference: "DEMO-PROFESSIONAL-001",
      createdAt: demoTime,
    },
  });
}

async function seedFailureAndManualFallback() {
  await prisma.hardwareCollectionSession.upsert({
    where: { id: "50000000-0000-4000-8000-000000000002" },
    update: {},
    create: {
      id: "50000000-0000-4000-8000-000000000002",
      triageId: ids.triages[3],
      deviceId: ids.device,
      origin: "SIMULATED_DEVICE",
      status: "FAILED",
      attemptNumber: 1,
      initiatedBy: "DEMO_OPERATOR",
      startedAt: demoTime,
      failedAt: demoTime,
      sanitizedErrorSummary: "SIMULATED_DEMO_TIMEOUT",
      createdAt: demoTime,
      errors: {
        create: {
          id: "90000000-0000-4000-8000-000000000001",
          errorCode: "DEMO_TIMEOUT",
          category: "SIMULATED",
          sanitizedMessage: "Falha simulada determinística, sem payload ou segredo.",
          isRecoverable: true,
          createdAt: demoTime,
        },
      },
    },
  });
  await prisma.hardwareCollectionSession.upsert({
    where: { id: "50000000-0000-4000-8000-000000000003" },
    update: {},
    create: {
      id: "50000000-0000-4000-8000-000000000003",
      triageId: ids.triages[3],
      origin: "MANUAL",
      status: "COMPLETED",
      attemptNumber: 2,
      initiatedBy: "DEMO_OPERATOR",
      startedAt: demoTime,
      completedAt: demoTime,
      sanitizedMetadata: { fallbackFrom: "SIMULATED_DEVICE", fixture: "DEMO" },
      createdAt: demoTime,
      measurements: {
        create: [
          {
            id: "51000000-0000-4000-8000-000000000003",
            vitalSignType: "HEART_RATE",
            numericValue: 78,
            unit: "bpm",
            origin: "MANUAL",
            technicalStatus: "ACCEPTED",
            qualityDescription: "DEMO manual sem validade clínica",
            receivedByServerAt: demoTime,
            acceptedIntoFlowAt: demoTime,
            sequenceNumber: 1,
            createdAt: demoTime,
          },
          {
            id: "51000000-0000-4000-8000-000000000004",
            vitalSignType: "SPO2",
            numericValue: 98,
            unit: "%",
            origin: "MANUAL",
            technicalStatus: "ACCEPTED",
            qualityDescription: "DEMO manual sem validade clínica",
            receivedByServerAt: demoTime,
            acceptedIntoFlowAt: demoTime,
            sequenceNumber: 2,
            createdAt: demoTime,
          },
        ],
      },
    },
  });
}

async function main() {
  await seedFoundation();
  await seedPatientsAndTriages();
  await seedSimulatedRecommendation();
  await seedHumanReview();
  await seedFailureAndManualFallback();
  console.info("Seed DEMO determinístico aplicado com sucesso.");
}

main()
  .catch((error: unknown) => {
    console.error("Falha sanitizada ao aplicar o seed DEMO.");
    process.exitCode = 1;
    if (process.env.NODE_ENV === "development" && error instanceof Error) {
      console.error(error.name);
    }
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

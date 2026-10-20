import "dotenv/config";

import { randomUUID } from "node:crypto";
import { assertSafeDemoDatabaseTarget } from "./local-database-safety.mjs";

async function main(): Promise<void> {
  if (!process.argv.includes("--confirm-test-groq")) throw new Error("Reexecute com --confirm-test-groq para autorizar uma única chamada externa com dados sintéticos.");
  const testDatabaseUrl = process.env.TEST_DATABASE_URL;
  if (!testDatabaseUrl) throw new Error("TEST_DATABASE_URL local é obrigatória.");
  assertSafeDemoDatabaseTarget({
    databaseUrl: testDatabaseUrl,
    directDatabaseUrl: testDatabaseUrl,
    appMode: process.env.APP_MODE,
    nodeEnv: process.env.NODE_ENV,
    vercelEnv: process.env.VERCEL_ENV,
  });
  if (!process.env.GROQ_API_KEY?.trim()) throw new Error("GROQ_API_KEY não está configurada.");

  process.env.DATABASE_URL = testDatabaseUrl;
  process.env.DIRECT_DATABASE_URL = testDatabaseUrl;
  const [{ prisma }, { aiSuggestion }] = await Promise.all([
    import("../src/server/db/prisma"),
    import("../src/server/ai-suggestion"),
  ]);

  const patient = await prisma.patient.create({ data: { displayName: "Paciente fictício — teste local Groq", birthDate: new Date("1990-01-01T00:00:00.000Z"), sex: "Não informado" } });
  const triage = await prisma.triage.create({ data: { patientId: patient.id, status: "AWAITING_NURSE_REVIEW", currentRecommendedPriority: "GREEN" } });
  await prisma.anamnesis.create({ data: { triageId: triage.id, mainComplaint: "Cenário sintético para validar integração técnica; sem relato clínico real.", subjectiveIntensity: 2, approximateDuration: "Duração fictícia de teste" } });
  const rules = await prisma.ruleSetVersion.create({ data: { stableKey: "groq-local-smoke", version: randomUUID(), description: "Fixture técnico sintético; não é regra clínica.", status: "EXPERIMENTAL" } });
  const run = await prisma.analysisRun.create({ data: { triageId: triage.id, ruleSetVersionId: rules.id, runType: "FINAL", status: "COMPLETED", completedAt: new Date(), sanitizedInputSnapshot: { collectionAttemptNumber: 1 } } });
  await prisma.analysisRecommendation.create({ data: { analysisRunId: run.id, recommendedPriority: "GREEN", requiresVitalSigns: false } });
  const collection = await prisma.hardwareCollectionSession.create({ data: { triageId: triage.id, origin: "MANUAL", status: "COMPLETED", attemptNumber: 1, completedAt: new Date(), initiatedBy: "PATIENT" } });
  await prisma.vitalSignMeasurement.createMany({ data: [
    { collectionSessionId: collection.id, vitalSignType: "HEART_RATE", numericValue: 78, unit: "bpm", origin: "MANUAL", technicalStatus: "ACCEPTED", receivedByServerAt: new Date(), acceptedIntoFlowAt: new Date(), sequenceNumber: 1 },
    { collectionSessionId: collection.id, vitalSignType: "SPO2", numericValue: 98, unit: "%", origin: "MANUAL", technicalStatus: "ACCEPTED", receivedByServerAt: new Date(), acceptedIntoFlowAt: new Date(), sequenceNumber: 2 },
  ] });
  const day = new Date();
  day.setUTCHours(0, 0, 0, 0);
  const sequence = (await prisma.queueTicket.aggregate({ where: { operationalDate: day }, _max: { sequenceNumber: true } }))._max.sequenceNumber ?? 0;
  const next = sequence + 1;
  await prisma.queueTicket.create({ data: { triageId: triage.id, operationalDate: day, sequenceNumber: next, publicCode: `T-${day.toISOString().slice(0, 10).replaceAll("-", "")}-${String(next).padStart(3, "0")}` } });

  try {
    const result = await aiSuggestion.generate(triage.id, "LOCAL_GROQ_SMOKE_TEST");
    const persisted = (await aiSuggestion.list(triage.id))[0];
    if (!persisted) throw new Error("A sugestão não foi recuperada do banco após a geração.");
    console.info(JSON.stringify({ result, persistedStatus: persisted.status, model: persisted.model, triagePath: `/enfermagem/triagens/${triage.id}` }));
    if (result !== "SAVED" || persisted.status !== "COMPLETED") process.exitCode = 2;
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Falha no teste local Groq.");
  process.exitCode = 1;
});

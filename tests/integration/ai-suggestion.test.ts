import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

import { prisma } from "@/server/db/prisma";
import { aiSuggestion } from "@/server/ai-suggestion";

const providerResult = {
  suggestion: "GREEN" as const,
  attention: "LOW" as const,
  evidenceKeys: ["mainComplaint", "bpm", "spo2"],
};

describe("PostgreSQL: sugestão de IA", () => {
  beforeAll(async () => {
    vi.stubEnv("APP_MODE", "demo");
    vi.stubEnv("GROQ_API_KEY", "fake-integration-key");
    await prisma.$executeRawUnsafe('TRUNCATE TABLE "AuditEvent", "AiSuggestion", "VitalSignMeasurement", "HardwareCollectionSession", "AnalysisRecommendation", "AnalysisRun", "RuleSetVersion", "AnamnesisAnswer", "Anamnesis", "QueueTicket", "ConsentRecord", "HealthPlanInformation", "Patient", "Triage" CASCADE');
  });

  afterAll(async () => {
    vi.unstubAllEnvs();
    await prisma.$disconnect();
  });

  it("persists and reloads a mocked suggestion once, with sanitized audit and unchanged official priority", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      choices: [{ message: { content: JSON.stringify(providerResult) } }],
    }), { status: 200, headers: { "Content-Type": "application/json" } }));
    vi.stubGlobal("fetch", fetchMock);

    const patient = await prisma.patient.create({ data: { displayName: "Pessoa Fictícia IA", birthDate: new Date("1990-01-01"), sex: "Não informado" } });
    const triage = await prisma.triage.create({ data: { patientId: patient.id, status: "AWAITING_NURSE_REVIEW", currentRecommendedPriority: "GREEN" } });
    const anamnesis = await prisma.anamnesis.create({ data: { triageId: triage.id, mainComplaint: "Queixa fictícia", subjectiveIntensity: 3 } });
    const rules = await prisma.ruleSetVersion.create({ data: { stableKey: "integration-test", version: "1", description: "Conjunto fictício de integração", status: "EXPERIMENTAL" } });
    const run = await prisma.analysisRun.create({ data: { triageId: triage.id, ruleSetVersionId: rules.id, runType: "FINAL", status: "COMPLETED", completedAt: new Date(), sanitizedInputSnapshot: { collectionAttemptNumber: 1 } } });
    await prisma.analysisRecommendation.create({ data: { analysisRunId: run.id, recommendedPriority: "GREEN", requiresVitalSigns: false } });
    const session = await prisma.hardwareCollectionSession.create({ data: { triageId: triage.id, origin: "MANUAL", status: "COMPLETED", attemptNumber: 1, completedAt: new Date(), initiatedBy: "PATIENT" } });
    await prisma.vitalSignMeasurement.createMany({ data: [
      { collectionSessionId: session.id, vitalSignType: "HEART_RATE", numericValue: 78, unit: "bpm", origin: "MANUAL", technicalStatus: "ACCEPTED", receivedByServerAt: new Date(), acceptedIntoFlowAt: new Date(), sequenceNumber: 1 },
      { collectionSessionId: session.id, vitalSignType: "SPO2", numericValue: 98, unit: "%", origin: "MANUAL", technicalStatus: "ACCEPTED", receivedByServerAt: new Date(), acceptedIntoFlowAt: new Date(), sequenceNumber: 2 },
    ] });

    await expect(aiSuggestion.generate(triage.id, "INTEGRATION_NURSE")).resolves.toBe("SAVED");
    await expect(aiSuggestion.generate(triage.id, "INTEGRATION_NURSE")).resolves.toBe("ALREADY_EXISTS");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await aiSuggestion.list(triage.id)).toMatchObject([{ analysisRunId: run.id, collectionAttemptNumber: 1, status: "COMPLETED", suggestedPriority: "GREEN", attentionLevel: "LOW", summary: "Sugestão verde com nível de atenção baixa.", indicators: [{ key: "mainComplaint", value: "Queixa fictícia" }, { key: "bpm", value: "78 bpm" }, { key: "spo2", value: "98%" }], dataConsidered: expect.arrayContaining([expect.objectContaining({ key: "systemPriority", value: "GREEN" })]), explanation: expect.stringContaining("Queixa principal") }]);
    expect(await prisma.auditEvent.findMany({ where: { triageId: triage.id, entityType: "AiSuggestion" }, orderBy: { createdAt: "asc" }, select: { action: true, sanitizedMetadata: true } })).toEqual([
      { action: "AI_SUGGESTION_REQUESTED", sanitizedMetadata: { promptVersion: "DEMO-AI-SUGGESTION-003", status: "PENDING" } },
      { action: "AI_SUGGESTION_COMPLETED", sanitizedMetadata: { promptVersion: "DEMO-AI-SUGGESTION-003", status: "COMPLETED" } },
    ]);
    expect(await prisma.triage.findUniqueOrThrow({ where: { id: triage.id }, select: { currentRecommendedPriority: true, finalHumanPriority: true, status: true } })).toEqual({ currentRecommendedPriority: "GREEN", finalHumanPriority: null, status: "AWAITING_NURSE_REVIEW" });
    expect(await prisma.anamnesis.findUniqueOrThrow({ where: { id: anamnesis.id }, select: { mainComplaint: true } })).toEqual({ mainComplaint: "Queixa fictícia" });
  });

  it("claims a final analysis once when two nurse actions race", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockImplementation(async () => {
      await new Promise((resolve) => setTimeout(resolve, 100));
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(providerResult) } }] }), { status: 200, headers: { "Content-Type": "application/json" } });
    });
    vi.stubGlobal("fetch", fetchMock);

    const patient = await prisma.patient.create({ data: { displayName: "Pessoa Fictícia concorrente" } });
    const triage = await prisma.triage.create({ data: { patientId: patient.id, status: "AWAITING_NURSE_REVIEW", currentRecommendedPriority: "GREEN" } });
    await prisma.anamnesis.create({ data: { triageId: triage.id, mainComplaint: "Queixa concorrente" } });
    const rules = await prisma.ruleSetVersion.create({ data: { stableKey: "integration-test", version: "3", description: "Conjunto fictício de integração", status: "EXPERIMENTAL" } });
    const run = await prisma.analysisRun.create({ data: { triageId: triage.id, ruleSetVersionId: rules.id, runType: "FINAL", status: "COMPLETED", completedAt: new Date(), sanitizedInputSnapshot: { collectionAttemptNumber: 1 } } });
    await prisma.analysisRecommendation.create({ data: { analysisRunId: run.id, recommendedPriority: "GREEN", requiresVitalSigns: false } });
    const session = await prisma.hardwareCollectionSession.create({ data: { triageId: triage.id, origin: "MANUAL", status: "COMPLETED", attemptNumber: 1, completedAt: new Date(), initiatedBy: "PATIENT" } });
    await prisma.vitalSignMeasurement.createMany({ data: [
      { collectionSessionId: session.id, vitalSignType: "HEART_RATE", numericValue: 78, unit: "bpm", origin: "MANUAL", technicalStatus: "ACCEPTED", receivedByServerAt: new Date(), acceptedIntoFlowAt: new Date(), sequenceNumber: 1 },
      { collectionSessionId: session.id, vitalSignType: "SPO2", numericValue: 98, unit: "%", origin: "MANUAL", technicalStatus: "ACCEPTED", receivedByServerAt: new Date(), acceptedIntoFlowAt: new Date(), sequenceNumber: 2 },
    ] });

    const outcomes = await Promise.all([
      aiSuggestion.generate(triage.id, "INTEGRATION_NURSE"),
      aiSuggestion.generate(triage.id, "INTEGRATION_NURSE"),
    ]);
    expect(outcomes).toContain("SAVED");
    expect(outcomes).toContain("IN_PROGRESS");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await prisma.aiSuggestion.count({ where: { triageId: triage.id } })).toBe(1);
    expect(await prisma.aiSuggestion.findUniqueOrThrow({ where: { analysisRunId: run.id }, select: { status: true, claimToken: true } })).toEqual({ status: "COMPLETED", claimToken: null });
  });

  it("persists UNAVAILABLE after a mocked provider failure without changing triage state", async () => {
    vi.stubGlobal("fetch", vi.fn<typeof fetch>().mockResolvedValue(new Response("provider test failure", { status: 503 })));
    const patient = await prisma.patient.create({ data: { displayName: "Pessoa Fictícia indisponível" } });
    const triage = await prisma.triage.create({ data: { patientId: patient.id, status: "AWAITING_NURSE_REVIEW", currentRecommendedPriority: "YELLOW" } });
    await prisma.anamnesis.create({ data: { triageId: triage.id, mainComplaint: "Queixa de teste" } });
    const rules = await prisma.ruleSetVersion.create({ data: { stableKey: "integration-test", version: "2", description: "Conjunto fictício de integração", status: "EXPERIMENTAL" } });
    const run = await prisma.analysisRun.create({ data: { triageId: triage.id, ruleSetVersionId: rules.id, runType: "FINAL", status: "COMPLETED", completedAt: new Date(), sanitizedInputSnapshot: { collectionAttemptNumber: 1 } } });
    await prisma.analysisRecommendation.create({ data: { analysisRunId: run.id, recommendedPriority: "YELLOW", requiresVitalSigns: false } });
    const session = await prisma.hardwareCollectionSession.create({ data: { triageId: triage.id, origin: "MANUAL", status: "COMPLETED", attemptNumber: 1, completedAt: new Date(), initiatedBy: "PATIENT" } });
    await prisma.vitalSignMeasurement.createMany({ data: [
      { collectionSessionId: session.id, vitalSignType: "HEART_RATE", numericValue: 78, unit: "bpm", origin: "MANUAL", technicalStatus: "ACCEPTED", receivedByServerAt: new Date(), acceptedIntoFlowAt: new Date(), sequenceNumber: 1 },
      { collectionSessionId: session.id, vitalSignType: "SPO2", numericValue: 98, unit: "%", origin: "MANUAL", technicalStatus: "ACCEPTED", receivedByServerAt: new Date(), acceptedIntoFlowAt: new Date(), sequenceNumber: 2 },
    ] });

    await expect(aiSuggestion.generate(triage.id, "INTEGRATION_NURSE")).resolves.toBe("UNAVAILABLE");
    expect(await aiSuggestion.list(triage.id)).toMatchObject([{ analysisRunId: run.id, status: "UNAVAILABLE", suggestedPriority: null, summary: null, indicators: [], dataConsidered: [], limitations: [] }]);
    expect(await prisma.auditEvent.findMany({ where: { triageId: triage.id, entityType: "AiSuggestion" }, orderBy: { createdAt: "asc" }, select: { action: true, sanitizedMetadata: true } })).toEqual([
      { action: "AI_SUGGESTION_REQUESTED", sanitizedMetadata: { promptVersion: "DEMO-AI-SUGGESTION-003", status: "PENDING" } },
      { action: "AI_SUGGESTION_UNAVAILABLE", sanitizedMetadata: { promptVersion: "DEMO-AI-SUGGESTION-003", status: "UNAVAILABLE" } },
    ]);
    expect(await prisma.triage.findUniqueOrThrow({ where: { id: triage.id }, select: { currentRecommendedPriority: true, finalHumanPriority: true, status: true } })).toEqual({ currentRecommendedPriority: "YELLOW", finalHumanPriority: null, status: "AWAITING_NURSE_REVIEW" });
  });
});

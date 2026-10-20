import "server-only";

import { randomUUID } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { demoAnamnesis } from "@/demo/anamnesis";
import { prisma } from "@/server/db/prisma";
import type { AiSuggestionInput, AiSuggestionResult, AiSuggestionView } from "@/server/application/ai-suggestion/ai-suggestion-types";
import { AI_PROMPT_VERSION, GROQ_MODEL } from "@/server/services/ai/groq-suggestion";

function ageAt(birthDate: Date | null): number | null {
  if (!birthDate) return null;
  const now = new Date();
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  if (now.getUTCMonth() < birthDate.getUTCMonth() || (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() < birthDate.getUTCDate())) age -= 1;
  return Math.max(0, age);
}

export class PrismaAiSuggestionRepository {
  async latestContext(triageId: string): Promise<{ analysisRunId: string; collectionSessionId: string; input: AiSuggestionInput } | null> {
    const triage = await prisma.triage.findUnique({
      where: { id: triageId },
      select: {
        status: true, currentRecommendedPriority: true,
        patient: { select: { birthDate: true, sex: true } },
        anamneses: { orderBy: { version: "desc" }, take: 1, select: { mainComplaint: true, subjectiveIntensity: true, approximateDuration: true, answers: { select: { questionKey: true, normalizedValue: true } } } },
        analysisRuns: { where: { runType: "FINAL", status: "COMPLETED" }, orderBy: { completedAt: "desc" }, take: 1, select: { id: true, sanitizedInputSnapshot: true } },
        collectionSessions: { where: { status: "COMPLETED", measurements: { some: { technicalStatus: "ACCEPTED" } } }, select: { id: true, attemptNumber: true, measurements: { where: { technicalStatus: "ACCEPTED" }, select: { vitalSignType: true, numericValue: true, externalMeasurementId: true } }, sourceDeviceCollectionSession: { select: { readings: { select: { id: true, temperature: true, weight: true, height: true } } } } } },
      },
    });
    if (!triage || triage.status !== "AWAITING_NURSE_REVIEW" || !triage.patient || !triage.anamneses[0] || !triage.analysisRuns[0] || !triage.currentRecommendedPriority) return null;
    const run = triage.analysisRuns[0];
    const attemptNumber = typeof run.sanitizedInputSnapshot === "object" && run.sanitizedInputSnapshot !== null && !Array.isArray(run.sanitizedInputSnapshot) ? run.sanitizedInputSnapshot.collectionAttemptNumber : null;
    if (typeof attemptNumber !== "number") return null;
    const collection = triage.collectionSessions.find((item) => item.attemptNumber === attemptNumber);
    if (!collection) return null;
    const bpm = collection.measurements.find((item) => item.vitalSignType === "HEART_RATE");
    const spo2 = collection.measurements.find((item) => item.vitalSignType === "SPO2");
    if (!bpm || !spo2) return null;
    const selectedId = bpm.externalMeasurementId?.split(":")[0];
    const physical = collection.sourceDeviceCollectionSession?.readings.find((item) => item.id === selectedId);
    const anamnesis = triage.anamneses[0];
    const alerts = anamnesis.answers.filter((answer) => answer.normalizedValue === "yes").flatMap((answer) => {
      const match = demoAnamnesis.alertQuestions.find((question) => question.key === answer.questionKey);
      return match ? [match.label] : [];
    });
    return { analysisRunId: run.id, collectionSessionId: collection.id, input: {
      ageYears: ageAt(triage.patient.birthDate), sex: triage.patient.sex,
      mainComplaint: anamnesis.mainComplaint, subjectiveIntensity: anamnesis.subjectiveIntensity,
      approximateDuration: anamnesis.approximateDuration, reportedAlerts: alerts,
      bpm: bpm.numericValue, spo2: spo2.numericValue,
      temperature: physical?.temperature ?? null, weight: physical?.weight ?? null, height: physical?.height ?? null,
      systemPriority: triage.currentRecommendedPriority,
    } };
  }

  async claim(triageId: string, analysisRunId: string, collectionSessionId: string, actorReference: string): Promise<{ kind: "CLAIMED"; claimToken: string } | { kind: "IN_PROGRESS" | "ALREADY_EXISTS" }> {
    const now = new Date();
    const claimToken = randomUUID();
    const staleBefore = new Date(now.getTime() - 60_000);
    try {
      return await prisma.$transaction(async (transaction) => {
        const existing = await transaction.aiSuggestion.findUnique({ where: { analysisRunId }, select: { id: true, status: true, updatedAt: true } });
        if (!existing) {
          const suggestion = await transaction.aiSuggestion.create({ data: {
            triageId, analysisRunId, collectionSessionId, claimToken, status: "PENDING",
            model: GROQ_MODEL, promptVersion: AI_PROMPT_VERSION,
          }, select: { id: true } });
          await transaction.auditEvent.create({ data: { triageId, entityType: "AiSuggestion", entityId: suggestion.id, action: "AI_SUGGESTION_REQUESTED", actorType: "NURSE", actorReference, sanitizedMetadata: { promptVersion: AI_PROMPT_VERSION, status: "PENDING" } } });
          return { kind: "CLAIMED", claimToken } as const;
        }
        if (existing.status !== "PENDING") return { kind: "ALREADY_EXISTS" } as const;
        if (existing.updatedAt > staleBefore) return { kind: "IN_PROGRESS" } as const;

        const reclaimed = await transaction.aiSuggestion.updateMany({
          where: { id: existing.id, status: "PENDING", updatedAt: { lte: staleBefore } },
          data: { claimToken, updatedAt: now },
        });
        if (reclaimed.count !== 1) return { kind: "IN_PROGRESS" } as const;
        await transaction.auditEvent.create({ data: { triageId, entityType: "AiSuggestion", entityId: existing.id, action: "AI_SUGGESTION_RETRY_CLAIMED", actorType: "NURSE", actorReference, sanitizedMetadata: { promptVersion: AI_PROMPT_VERSION, status: "PENDING" } } });
        return { kind: "CLAIMED", claimToken } as const;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const existing = await prisma.aiSuggestion.findUnique({ where: { analysisRunId }, select: { status: true } });
        return existing?.status === "PENDING" ? { kind: "IN_PROGRESS" } : { kind: "ALREADY_EXISTS" };
      }
      throw error;
    }
  }

  async save(triageId: string, analysisRunId: string, claimToken: string, result: AiSuggestionResult | null, actorReference: string): Promise<boolean> {
    return prisma.$transaction(async (transaction) => {
      const saved = await transaction.aiSuggestion.updateMany({
        where: { analysisRunId, status: "PENDING", claimToken },
        data: {
          status: result ? "COMPLETED" : "UNAVAILABLE",
          suggestedPriority: result?.priority,
          attentionLevel: result?.attention,
          conclusion: result?.conclusion,
          factors: result?.factors ?? Prisma.JsonNull,
          claimToken: null,
          completedAt: new Date(),
        },
      });
      if (saved.count !== 1) return false;
      const suggestion = await transaction.aiSuggestion.findUniqueOrThrow({ where: { analysisRunId }, select: { id: true } });
      await transaction.auditEvent.create({ data: { triageId, entityType: "AiSuggestion", entityId: suggestion.id, action: result ? "AI_SUGGESTION_COMPLETED" : "AI_SUGGESTION_UNAVAILABLE", actorType: "NURSE", actorReference, sanitizedMetadata: { promptVersion: AI_PROMPT_VERSION, status: result ? "COMPLETED" : "UNAVAILABLE" } } });
      return true;
    });
  }

  async list(triageId: string): Promise<AiSuggestionView[]> {
    const records = await prisma.aiSuggestion.findMany({ where: { triageId }, orderBy: { createdAt: "desc" }, select: { id: true, analysisRunId: true, status: true, suggestedPriority: true, attentionLevel: true, conclusion: true, factors: true, model: true, createdAt: true, collectionSession: { select: { attemptNumber: true } } } });
    return records.map((record) => ({ id: record.id, analysisRunId: record.analysisRunId, collectionAttemptNumber: record.collectionSession.attemptNumber, status: record.status, suggestedPriority: record.suggestedPriority, attentionLevel: record.attentionLevel, conclusion: record.conclusion, factors: Array.isArray(record.factors) ? record.factors.filter((item): item is string => typeof item === "string") : [], model: record.model, createdAt: record.createdAt }));
  }
}

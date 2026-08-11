import "server-only";

import { assertTriageTransition } from "@/domain/triage/triage-transitions";
import type { AnalysisPriority, NormalizedAnalysisInput } from "@/domain/analysis/analysis-types";
import type { AnalysisView } from "@/server/application/analysis/analysis-view";
import { VitalSignsFlowError } from "@/server/application/vital-signs/vital-signs-errors";
import type { VitalSignsRepository } from "@/server/application/vital-signs/vital-signs-repository";
import type { CollectionAttemptView, RecordAttemptInput, VitalSignsFlowView } from "@/server/application/vital-signs/vital-signs-types";
import { prisma } from "@/server/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { ensureQueueTicket } from "@/server/repositories/queue-ticket-transaction";
import { finalAnalysisFingerprint } from "@/server/application/vital-signs/final-analysis-fingerprint";

function attemptView(session: { id: string; attemptNumber: number; origin: string; status: string; sanitizedErrorSummary: string | null; measurements: { vitalSignType: string; numericValue: number; unit: string }[] }): CollectionAttemptView {
  return { id: session.id, attemptNumber: session.attemptNumber, origin: session.origin as CollectionAttemptView["origin"], status: session.status as CollectionAttemptView["status"], readings: session.measurements.map((item) => ({ type: item.vitalSignType as "HEART_RATE" | "SPO2", numericValue: item.numericValue, unit: item.unit })), safeError: session.sanitizedErrorSummary ?? undefined };
}

const finalRunInclude = { ruleSetVersion: { select: { version: true } }, recommendation: { include: { reasons: { orderBy: { displayOrder: "asc" as const } } } }, triage: { select: { status: true } } } as const;

function finalView(run: { id: string; completedAt: Date | null; ruleSetVersion: { version: string }; recommendation: { recommendedPriority: string; requiresVitalSigns: boolean; reasons: { reasonCode: string; explanation: string; category: string; displayOrder: number }[] } | null; triage: { status: string } }): AnalysisView {
  if (!run.completedAt || !run.recommendation) throw new VitalSignsFlowError();
  return { analysisRunId: run.id, recommendedPriority: run.recommendation.recommendedPriority as AnalysisPriority, requiresVitalSigns: run.recommendation.requiresVitalSigns, reasons: run.recommendation.reasons.map((reason) => ({ code: reason.reasonCode, explanation: reason.explanation, category: reason.category, displayOrder: reason.displayOrder })), ruleSetVersion: run.ruleSetVersion.version, executedAt: run.completedAt, triageStatus: run.triage.status as AnalysisView["triageStatus"] };
}

export class PrismaVitalSignsRepository implements VitalSignsRepository {
  async getFlow(triageId: string): Promise<VitalSignsFlowView> {
    const triage = await prisma.triage.findUnique({ where: { id: triageId }, include: { collectionSessions: { orderBy: { attemptNumber: "asc" }, include: { measurements: true } } } });
    if (!triage) throw new VitalSignsFlowError();
    const attempts = triage.collectionSessions.map(attemptView);
    const latest = attempts.at(-1);
    return { triageStatus: triage.status, attempts, canConfirm: latest?.status === "COMPLETED" && latest.readings.some((item) => item.type === "HEART_RATE") && latest.readings.some((item) => item.type === "SPO2") };
  }

  async recordAttempt({ triageId, result }: RecordAttemptInput): Promise<VitalSignsFlowView> {
    await prisma.$transaction(async (transaction) => {
      const triage = await transaction.triage.findUnique({ where: { id: triageId }, include: { collectionSessions: { select: { attemptNumber: true } } } });
      if (!triage || (triage.status !== "VITAL_SIGNS_REQUIRED" && triage.status !== "VITAL_SIGNS_IN_PROGRESS" && triage.status !== "RECOLLECTION_REQUESTED")) throw new VitalSignsFlowError();
      const attemptNumber = Math.max(0, ...triage.collectionSessions.map((item) => item.attemptNumber)) + 1;
      if (triage.status === "VITAL_SIGNS_REQUIRED") assertTriageTransition("VITAL_SIGNS_REQUIRED", "VITAL_SIGNS_IN_PROGRESS");
      if (triage.status === "RECOLLECTION_REQUESTED") assertTriageTransition("RECOLLECTION_REQUESTED", "VITAL_SIGNS_IN_PROGRESS");
      const status = result.status;
      const session = await transaction.hardwareCollectionSession.create({
        data: {
          triageId, origin: result.origin, status, attemptNumber, initiatedBy: "PATIENT", completedAt: status === "COMPLETED" ? new Date() : null, failedAt: status === "FAILED" || status === "EXPIRED" ? new Date() : null,
          sanitizedErrorSummary: "errorCode" in result ? result.errorCode : null,
          measurements: status === "COMPLETED" ? { create: result.readings.map((reading, index) => ({ vitalSignType: reading.type, numericValue: reading.numericValue, unit: reading.unit, origin: result.origin, technicalStatus: "ACCEPTED", receivedByServerAt: new Date(), acceptedIntoFlowAt: new Date(), sequenceNumber: index + 1 })) } : undefined,
          errors: "errorCode" in result ? { create: { errorCode: result.errorCode, category: "DEMO_COLLECTION", sanitizedMessage: result.safeMessage, isRecoverable: true } } : undefined,
        },
      });
      await transaction.triage.update({ where: { id: triageId }, data: { status: "VITAL_SIGNS_IN_PROGRESS" } });
      const events: Prisma.AuditEventCreateManyInput[] = [{ triageId, entityType: "HardwareCollectionSession", entityId: session.id, action: "VITAL_SIGNS_COLLECTION_STARTED", actorType: "PATIENT", sanitizedMetadata: { origin: result.origin, attemptNumber, status: "IN_PROGRESS" } }];
      if (attemptNumber > 1) events.push({ triageId, entityType: "HardwareCollectionSession", entityId: session.id, action: "VITAL_SIGNS_RECOLLECTION_REQUESTED", actorType: "PATIENT", sanitizedMetadata: { origin: result.origin, attemptNumber, status } });
      events.push({ triageId, entityType: "HardwareCollectionSession", entityId: session.id, action: status === "COMPLETED" ? "VITAL_SIGNS_RECORDED" : "VITAL_SIGNS_COLLECTION_FAILED", actorType: "PATIENT", sanitizedMetadata: { origin: result.origin, attemptNumber, types: status === "COMPLETED" ? result.readings.map((reading) => reading.type) : [], status } });
      await transaction.auditEvent.createMany({ data: events });
    });
    return this.getFlow(triageId);
  }

  async completeAndAnalyze(input: Parameters<VitalSignsRepository["completeAndAnalyze"]>[0]): Promise<AnalysisView> {
    const ruleSet = await prisma.ruleSetVersion.upsert({ where: { stableKey_version: { stableKey: "DEMO_FINAL_ANALYSIS", version: input.ruleSetVersion } }, update: {}, create: { stableKey: "DEMO_FINAL_ANALYSIS", version: input.ruleSetVersion, description: input.ruleSetDescription, status: "EXPERIMENTAL" } });
    return prisma.$transaction(async (transaction) => {
      const triage = await transaction.triage.findUnique({ where: { id: input.triageId }, include: { anamneses: { orderBy: { version: "desc" }, take: 1, include: { answers: true } }, collectionSessions: { where: { status: "COMPLETED" }, orderBy: { attemptNumber: "desc" }, take: 1, include: { measurements: { where: { technicalStatus: "ACCEPTED" } } } } } });
      const anamnesis = triage?.anamneses[0];
      const collection = triage?.collectionSessions[0];
      if (!triage || !anamnesis || !collection || anamnesis.subjectiveIntensity === null || triage.status !== "VITAL_SIGNS_IN_PROGRESS") throw new VitalSignsFlowError();
      const heartRate = collection.measurements.find((item) => item.vitalSignType === "HEART_RATE");
      const spo2 = collection.measurements.find((item) => item.vitalSignType === "SPO2");
      if (!heartRate || !spo2) throw new VitalSignsFlowError("FC e SpO₂ aceitas são obrigatórias.");
      const alertAnswers = Object.fromEntries(anamnesis.answers.map((answer) => [answer.questionKey, answer.normalizedValue])) as Record<string, "yes" | "no">;
      const normalized: NormalizedAnalysisInput = { catalogVersion: anamnesis.answers[0].questionVersion, subjectiveIntensity: anamnesis.subjectiveIntensity, alertAnswers, vitalSigns: { heartRate: heartRate.numericValue, spo2: spo2.numericValue } };
      const evaluated = input.evaluate(normalized);
      const contextualFingerprint = finalAnalysisFingerprint(evaluated.fingerprint, collection.id, collection.attemptNumber);
      const existing = await transaction.analysisRun.findUnique({ where: { triageId_runType_ruleSetVersionId_inputFingerprint: { triageId: triage.id, runType: "FINAL", ruleSetVersionId: ruleSet.id, inputFingerprint: contextualFingerprint } }, include: finalRunInclude });
      if (existing) return finalView(existing);
      assertTriageTransition("VITAL_SIGNS_IN_PROGRESS", "FINAL_ANALYSIS_PENDING");
      assertTriageTransition("FINAL_ANALYSIS_PENDING", "AWAITING_NURSE_REVIEW");
      const run = await transaction.analysisRun.create({ data: { triageId: triage.id, ruleSetVersionId: ruleSet.id, runType: "FINAL", status: "COMPLETED", inputFingerprint: contextualFingerprint, startedAt: evaluated.result.executedAt, completedAt: evaluated.result.executedAt, sanitizedInputSnapshot: { catalogVersion: normalized.catalogVersion, acceptedMeasurementTypes: ["HEART_RATE", "SPO2"], collectionAttemptNumber: collection.attemptNumber }, recommendation: { create: { recommendedPriority: evaluated.result.recommendedPriority, requiresVitalSigns: false, createdAt: evaluated.result.executedAt, reasons: { create: evaluated.result.reasons.map((reason, index) => ({ reasonCode: reason.code, explanation: reason.explanation, category: reason.category, displayOrder: index + 1 })) } } } }, include: finalRunInclude });
      await transaction.triage.update({ where: { id: triage.id }, data: { status: "AWAITING_NURSE_REVIEW", currentRecommendedPriority: evaluated.result.recommendedPriority } });
      await ensureQueueTicket(transaction, triage.id, evaluated.result.executedAt);
      await transaction.auditEvent.create({ data: { triageId: triage.id, entityType: "AnalysisRun", entityId: run.id, action: "FINAL_ANALYSIS_COMPLETED", actorType: "SYSTEM", sanitizedMetadata: { ruleSetVersion: evaluated.result.ruleSetVersion, previousStatus: "VITAL_SIGNS_IN_PROGRESS", intermediateStatus: "FINAL_ANALYSIS_PENDING", nextStatus: "AWAITING_NURSE_REVIEW", types: ["HEART_RATE", "SPO2"] } } });
      return { ...finalView(run), triageStatus: "AWAITING_NURSE_REVIEW" };
    });
  }

  async findLatestFinalAnalysis(triageId: string): Promise<AnalysisView | null> {
    const run = await prisma.analysisRun.findFirst({ where: { triageId, runType: "FINAL", status: "COMPLETED" }, orderBy: { completedAt: "desc" }, include: finalRunInclude });
    return run ? finalView(run) : null;
  }
}

import "server-only";

import type { NursingQueueRepository } from "@/server/application/nursing/nursing-repository";
import type { NursingMutationRepository } from "@/server/application/nursing/nursing-mutation-repository";
import type { ClassificationInput, RecollectionInput, ReferralInput } from "@/server/application/nursing/nursing-mutation-types";
import { NursingMutationConflictError } from "@/server/application/nursing/nursing-mutation-errors";
import type { CareQueueItemDto, NursingAnalysisDto, NursingPriority, NursingQueueItemDto, NursingReferralItemDto, NursingTriageDetailDto } from "@/server/application/nursing/nursing-types";
import { prisma } from "@/server/db/prisma";
import { Prisma } from "@/generated/prisma/client";
import { assertTriageTransition } from "@/domain/triage/triage-transitions";

const timelineLabels: Record<string, string> = {
  TRIAGE_STARTED: "Triagem iniciada",
  IDENTIFICATION_SAVED: "Identificação concluída",
  CONSENT_ACCEPTED: "Consentimento aceito",
  ANAMNESIS_COMPLETED: "Anamnese concluída",
  VITAL_SIGNS_RECORDED: "Sinais vitais registrados",
  FINAL_ANALYSIS_COMPLETED: "Análise após sinais vitais concluída",
  QUEUE_TICKET_ISSUED: "Senha operacional emitida",
  PATIENT_FLOW_COMPLETED: "Aguardando revisão da enfermagem",
  NURSE_RECOMMENDATION_CONFIRMED: "Recomendação confirmada pela enfermagem",
  NURSE_PRIORITY_RECLASSIFIED: "Prioridade reclassificada pela enfermagem",
  VITAL_SIGNS_RECOLLECTION_REQUESTED: "Nova coleta solicitada",
  CARE_REFERRAL_CREATED: "Encaminhamento criado",
  PATIENT_CALLED: "Senha chamada para atendimento",
  CARE_STARTED: "Atendimento iniciado",
  CARE_COMPLETED: "Atendimento concluído",
};

function ageAt(birthDate: Date | null, now: Date): number | null {
  if (!birthDate) return null;
  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  if (now.getUTCMonth() < birthDate.getUTCMonth() || (now.getUTCMonth() === birthDate.getUTCMonth() && now.getUTCDate() < birthDate.getUTCDate())) age -= 1;
  return Math.max(0, age);
}

function waitingMinutes(enteredAt: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - enteredAt.getTime()) / 60_000));
}

function normalizedAnswer(value: unknown): "yes" | "no" {
  return value === "yes" ? "yes" : "no";
}

const MAX_MUTATION_ATTEMPTS = 3;

export class PrismaNursingQueueRepository implements NursingQueueRepository, NursingMutationRepository {
  private async mutate<T>(operation: (transaction: Prisma.TransactionClient) => Promise<T>): Promise<T> {
    for (let attempt = 1; attempt <= MAX_MUTATION_ATTEMPTS; attempt += 1) {
      try {
        return await prisma.$transaction(operation, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error: unknown) {
        const retryable = error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
        if (!retryable || attempt === MAX_MUTATION_ATTEMPTS) {
          if (retryable) throw new NursingMutationConflictError();
          throw error;
        }
      }
    }
    throw new NursingMutationConflictError();
  }

  async confirmClassification(triageId: string, actorReference: string): Promise<void> {
    await this.mutate(async (transaction) => {
      const triage = await transaction.triage.findUnique({ where: { id: triageId }, include: { nurseReviews: { orderBy: { reviewedAt: "desc" }, take: 1 }, analysisRuns: { where: { status: "COMPLETED", recommendation: { isNot: null } }, orderBy: { completedAt: "desc" }, take: 1, include: { recommendation: true } } } });
      const recommendation = triage?.analysisRuns[0]?.recommendation;
      if (triage?.status === "CARE_WAITING" && triage.nurseReviews[0]?.decision === "CONFIRMED" && triage.nurseReviews[0].confirmedPriority === triage.finalHumanPriority) return;
      if (!triage || triage.status !== "AWAITING_NURSE_REVIEW" || !recommendation || !triage.currentRecommendedPriority) throw new NursingMutationConflictError();
      assertTriageTransition("AWAITING_NURSE_REVIEW", "CARE_WAITING");
      const review = await transaction.nurseReview.create({ data: { triageId, reviewedRecommendationId: recommendation.id, confirmedPriority: triage.currentRecommendedPriority, decision: "CONFIRMED", professionalReference: actorReference } });
      await transaction.triage.update({ where: { id: triageId }, data: { status: "CARE_WAITING", finalHumanPriority: triage.currentRecommendedPriority } });
      await transaction.careAttendance.create({ data: { triageId, status: "WAITING" } });
      await transaction.auditEvent.create({ data: { triageId, entityType: "NurseReview", entityId: review.id, action: "NURSE_RECOMMENDATION_CONFIRMED", actorType: "NURSE", actorReference, sanitizedMetadata: { recommendedPriority: triage.currentRecommendedPriority, humanPriority: triage.currentRecommendedPriority, decision: "CONFIRMED", previousStatus: "AWAITING_NURSE_REVIEW", nextStatus: "CARE_WAITING", hasJustification: false } } });
    });
  }

  async reclassify(triageId: string, input: ClassificationInput, actorReference: string): Promise<void> {
    await this.mutate(async (transaction) => {
      const triage = await transaction.triage.findUnique({ where: { id: triageId }, include: { nurseReviews: { orderBy: { reviewedAt: "desc" }, take: 1 }, analysisRuns: { where: { status: "COMPLETED", recommendation: { isNot: null } }, orderBy: { completedAt: "desc" }, take: 1, include: { recommendation: true } } } });
      const latestReview = triage?.nurseReviews[0];
      if (triage?.status === "CARE_WAITING" && latestReview?.decision === "RECLASSIFIED" && latestReview.confirmedPriority === input.priority && latestReview.justification === input.justification) return;
      const recommendation = triage?.analysisRuns[0]?.recommendation;
      if (!triage || triage.status !== "AWAITING_NURSE_REVIEW" || !recommendation || !triage.currentRecommendedPriority) throw new NursingMutationConflictError();
      assertTriageTransition("AWAITING_NURSE_REVIEW", "CARE_WAITING");
      const review = await transaction.nurseReview.create({ data: { triageId, reviewedRecommendationId: recommendation.id, confirmedPriority: input.priority, decision: "RECLASSIFIED", justification: input.justification, professionalReference: actorReference } });
      await transaction.triage.update({ where: { id: triageId }, data: { status: "CARE_WAITING", finalHumanPriority: input.priority } });
      await transaction.careAttendance.create({ data: { triageId, status: "WAITING" } });
      await transaction.auditEvent.create({ data: { triageId, entityType: "NurseReview", entityId: review.id, action: "NURSE_PRIORITY_RECLASSIFIED", actorType: "NURSE", actorReference, sanitizedMetadata: { recommendedPriority: triage.currentRecommendedPriority, humanPriority: input.priority, decision: "RECLASSIFIED", previousStatus: "AWAITING_NURSE_REVIEW", nextStatus: "CARE_WAITING", hasJustification: true } } });
    });
  }

  async requestRecollection(triageId: string, input: RecollectionInput, actorReference: string): Promise<void> {
    await this.mutate(async (transaction) => {
      const triage = await transaction.triage.findUnique({ where: { id: triageId }, select: { status: true } });
      if (triage?.status === "RECOLLECTION_REQUESTED") return;
      if (!triage || triage.status !== "AWAITING_NURSE_REVIEW") throw new NursingMutationConflictError();
      assertTriageTransition("AWAITING_NURSE_REVIEW", "RECOLLECTION_REQUESTED");
      await transaction.triage.update({ where: { id: triageId }, data: { status: "RECOLLECTION_REQUESTED" } });
      await transaction.auditEvent.create({ data: { triageId, entityType: "Triage", entityId: triageId, action: "VITAL_SIGNS_RECOLLECTION_REQUESTED", actorType: "NURSE", actorReference, sanitizedMetadata: { previousStatus: "AWAITING_NURSE_REVIEW", nextStatus: "RECOLLECTION_REQUESTED", hasReason: Boolean(input.reason) } } });
    });
  }

  async referToCare(triageId: string, input: ReferralInput, actorReference: string): Promise<void> {
    await this.mutate(async (transaction) => {
      const triage = await transaction.triage.findUnique({ where: { id: triageId }, include: { careReferrals: { where: { status: "REFERRED" }, orderBy: { referredAt: "desc" }, take: 1 }, nurseReviews: { orderBy: { reviewedAt: "desc" }, take: 1 } } });
      if (triage?.status === "REFERRED_TO_CARE" && triage.careReferrals.length > 0) return;
      if (!triage || triage.status !== "CLASSIFIED" || !triage.finalHumanPriority || triage.nurseReviews.length === 0) throw new NursingMutationConflictError();
      assertTriageTransition("CLASSIFIED", "REFERRED_TO_CARE");
      const referral = await transaction.careReferral.create({ data: { triageId, status: "REFERRED", referredAt: new Date(), destinationDescription: input.destination, notes: input.notes } });
      await transaction.triage.update({ where: { id: triageId }, data: { status: "REFERRED_TO_CARE" } });
      await transaction.auditEvent.create({ data: { triageId, entityType: "CareReferral", entityId: referral.id, action: "CARE_REFERRAL_CREATED", actorType: "NURSE", actorReference, sanitizedMetadata: { humanPriority: triage.finalHumanPriority, previousStatus: "CLASSIFIED", nextStatus: "REFERRED_TO_CARE", destinationSummary: input.destination ? "INFORMED" : "NOT_INFORMED" } } });
    });
  }

  async callNext(actorReference: string): Promise<{ triageId: string; ticketCode: string } | null> {
    return this.mutate(async (transaction) => {
      const candidates = await transaction.triage.findMany({
        where: { status: "CARE_WAITING", finalHumanPriority: { not: null }, careAttendance: { is: { status: "WAITING" } }, queueTicket: { isNot: null } },
        select: { id: true, finalHumanPriority: true, careAttendance: { select: { queuedAt: true } }, queueTicket: { select: { publicCode: true } } },
      });
      const order: Record<NursingPriority, number> = { RED: 0, YELLOW: 1, GREEN: 2 };
      const next = candidates.sort((left, right) => order[left.finalHumanPriority as NursingPriority] - order[right.finalHumanPriority as NursingPriority] || (left.careAttendance?.queuedAt.getTime() ?? 0) - (right.careAttendance?.queuedAt.getTime() ?? 0))[0];
      if (!next?.queueTicket) return null;
      assertTriageTransition("CARE_WAITING", "CALLED");
      const now = new Date();
      await transaction.triage.update({ where: { id: next.id }, data: { status: "CALLED" } });
      await transaction.careAttendance.update({ where: { triageId: next.id }, data: { status: "CALLED", calledAt: now, calledBy: actorReference } });
      await transaction.queueTicket.update({ where: { triageId: next.id }, data: { status: "CALLED", calledAt: now } });
      await transaction.auditEvent.create({ data: { triageId: next.id, entityType: "CareAttendance", entityId: next.id, action: "PATIENT_CALLED", actorType: "NURSE", actorReference, sanitizedMetadata: { previousStatus: "CARE_WAITING", nextStatus: "CALLED", priority: next.finalHumanPriority } } });
      return { triageId: next.id, ticketCode: next.queueTicket.publicCode };
    });
  }

  async startCare(triageId: string, actorReference: string): Promise<void> {
    await this.mutate(async (transaction) => {
      const triage = await transaction.triage.findUnique({ where: { id: triageId }, select: { status: true, careAttendance: { select: { status: true } } } });
      if (triage?.status === "IN_SERVICE" && triage.careAttendance?.status === "IN_SERVICE") return;
      if (triage?.status !== "CALLED" || triage.careAttendance?.status !== "CALLED") throw new NursingMutationConflictError();
      assertTriageTransition("CALLED", "IN_SERVICE");
      const now = new Date();
      await transaction.triage.update({ where: { id: triageId }, data: { status: "IN_SERVICE" } });
      await transaction.careAttendance.update({ where: { triageId }, data: { status: "IN_SERVICE", serviceStartedAt: now, serviceStartedBy: actorReference } });
      await transaction.auditEvent.create({ data: { triageId, entityType: "CareAttendance", entityId: triageId, action: "CARE_STARTED", actorType: "NURSE", actorReference, sanitizedMetadata: { previousStatus: "CALLED", nextStatus: "IN_SERVICE" } } });
    });
  }

  async completeCare(triageId: string, actorReference: string): Promise<void> {
    await this.mutate(async (transaction) => {
      const triage = await transaction.triage.findUnique({ where: { id: triageId }, select: { status: true, careAttendance: { select: { status: true } } } });
      if (triage?.status === "COMPLETED" && triage.careAttendance?.status === "COMPLETED") return;
      if (triage?.status !== "IN_SERVICE" || triage.careAttendance?.status !== "IN_SERVICE") throw new NursingMutationConflictError();
      assertTriageTransition("IN_SERVICE", "COMPLETED");
      const now = new Date();
      await transaction.triage.update({ where: { id: triageId }, data: { status: "COMPLETED", completedAt: now } });
      await transaction.careAttendance.update({ where: { triageId }, data: { status: "COMPLETED", completedAt: now, completedBy: actorReference } });
      await transaction.queueTicket.update({ where: { triageId }, data: { status: "CLOSED", closedAt: now } });
      await transaction.auditEvent.create({ data: { triageId, entityType: "CareAttendance", entityId: triageId, action: "CARE_COMPLETED", actorType: "NURSE", actorReference, sanitizedMetadata: { previousStatus: "IN_SERVICE", nextStatus: "COMPLETED" } } });
    });
  }

  async listCareQueue(_now: Date): Promise<CareQueueItemDto[]> {
    const records = await prisma.careAttendance.findMany({
      where: { status: { in: ["WAITING", "CALLED", "IN_SERVICE", "COMPLETED"] } },
      orderBy: [{ completedAt: "desc" }, { queuedAt: "asc" }],
      select: { status: true, destination: true, queuedAt: true, calledAt: true, serviceStartedAt: true, completedAt: true, triage: { select: { id: true, finalHumanPriority: true, patient: { select: { displayName: true, birthDate: true } }, queueTicket: { select: { publicCode: true } } } } },
    });
    return records.flatMap((record) => record.triage.patient && record.triage.queueTicket && record.triage.finalHumanPriority ? [{ triageId: record.triage.id, ticketCode: record.triage.queueTicket.publicCode, displayName: record.triage.patient.displayName, ageYears: ageAt(record.triage.patient.birthDate, _now), priority: record.triage.finalHumanPriority as NursingPriority, status: record.status as CareQueueItemDto["status"], destination: record.destination, queuedAt: record.queuedAt, calledAt: record.calledAt, serviceStartedAt: record.serviceStartedAt, completedAt: record.completedAt }] : []);
  }
  async listAwaitingReview(now: Date): Promise<NursingQueueItemDto[]> {
    const triages = await prisma.triage.findMany({
      where: { status: "AWAITING_NURSE_REVIEW", patient: { isNot: null }, queueTicket: { isNot: null }, currentRecommendedPriority: { not: null } },
      select: {
        id: true, currentRecommendedPriority: true,
        patient: { select: { displayName: true, birthDate: true } },
        queueTicket: { select: { publicCode: true, issuedAt: true } },
        anamneses: { orderBy: { version: "desc" }, take: 1, select: { mainComplaint: true, answers: { select: { normalizedValue: true } } } },
        collectionSessions: { where: { measurements: { some: { technicalStatus: "ACCEPTED" } } }, take: 1, select: { id: true } },
      },
    });
    return triages.flatMap((triage) => {
      const patient = triage.patient;
      const ticket = triage.queueTicket;
      const anamnesis = triage.anamneses[0];
      if (!patient || !ticket || !anamnesis || !triage.currentRecommendedPriority) return [];
      return [{ triageId: triage.id, ticketCode: ticket.publicCode, displayName: patient.displayName, ageYears: ageAt(patient.birthDate, now), mainComplaint: anamnesis.mainComplaint, recommendedPriority: triage.currentRecommendedPriority as NursingPriority, enteredQueueAt: ticket.issuedAt, waitingMinutes: waitingMinutes(ticket.issuedAt, now), hasVitalSigns: triage.collectionSessions.length > 0, hasDemoAlert: anamnesis.answers.some((answer) => normalizedAnswer(answer.normalizedValue) === "yes") }];
    });
  }

  async listReferred(now: Date): Promise<NursingReferralItemDto[]> {
    const triages = await prisma.triage.findMany({
      where: { status: "REFERRED_TO_CARE", patient: { isNot: null }, queueTicket: { isNot: null }, finalHumanPriority: { not: null }, careReferrals: { some: { status: "REFERRED" } } },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true, finalHumanPriority: true,
        patient: { select: { displayName: true, birthDate: true } },
        queueTicket: { select: { publicCode: true } },
        careReferrals: { where: { status: "REFERRED" }, orderBy: { referredAt: "desc" }, take: 1, select: { destinationDescription: true, referredAt: true } },
      },
    });
    return triages.flatMap((triage) => {
      const patient = triage.patient;
      const ticket = triage.queueTicket;
      const referral = triage.careReferrals[0];
      if (!patient || !ticket || !referral?.referredAt || !triage.finalHumanPriority) return [];
      return [{ triageId: triage.id, ticketCode: ticket.publicCode, displayName: patient.displayName, ageYears: ageAt(patient.birthDate, now), finalPriority: triage.finalHumanPriority as NursingPriority, destination: referral.destinationDescription, referredAt: referral.referredAt }];
    });
  }

  async findAwaitingReviewDetail(triageId: string, now: Date): Promise<NursingTriageDetailDto | null> {
    const triage = await prisma.triage.findFirst({
      where: { id: triageId, status: { in: ["AWAITING_NURSE_REVIEW", "RECOLLECTION_REQUESTED", "CLASSIFIED", "REFERRED_TO_CARE", "CARE_WAITING", "CALLED", "IN_SERVICE", "COMPLETED"] } },
      select: {
        status: true, currentRecommendedPriority: true,
        patient: { select: { displayName: true, birthDate: true, healthPlans: { orderBy: { createdAt: "desc" }, take: 1, select: { hasHealthPlan: true, planName: true } } } },
        queueTicket: { select: { publicCode: true } },
        anamneses: { orderBy: { version: "desc" }, take: 1, select: { mainComplaint: true, additionalDescription: true, subjectiveIntensity: true, symptomStartedAt: true, approximateDuration: true, declaredAllergies: true, declaredMedications: true, declaredPreexistingConditions: true, answers: { orderBy: { questionKey: "asc" }, select: { questionKey: true, normalizedValue: true } } } },
        analysisRuns: { where: { status: "COMPLETED", recommendation: { isNot: null } }, orderBy: { completedAt: "asc" }, select: { runType: true, completedAt: true, ruleSetVersion: { select: { version: true } }, recommendation: { select: { recommendedPriority: true, reasons: { orderBy: { displayOrder: "asc" }, select: { explanation: true } } } } } },
        collectionSessions: { orderBy: { attemptNumber: "asc" }, select: { attemptNumber: true, origin: true, status: true, startedAt: true, measurements: { orderBy: { sequenceNumber: "asc" }, select: { vitalSignType: true, numericValue: true, unit: true, technicalStatus: true } } } },
        auditEvents: { where: { action: { in: Object.keys(timelineLabels) } }, orderBy: { createdAt: "asc" }, select: { action: true, createdAt: true } },
        nurseReviews: { orderBy: { reviewedAt: "desc" }, take: 1, select: { confirmedPriority: true, decision: true, justification: true, reviewedAt: true } },
        careReferrals: { where: { status: "REFERRED" }, orderBy: { referredAt: "desc" }, take: 1, select: { destinationDescription: true, notes: true, referredAt: true } },
      },
    });
    const patient = triage?.patient;
    const ticket = triage?.queueTicket;
    const anamnesis = triage?.anamneses[0];
    if (!triage || !patient || !ticket || !anamnesis || !triage.currentRecommendedPriority) return null;

    const analyses: NursingAnalysisDto[] = triage.analysisRuns.flatMap((run) => run.completedAt && run.recommendation ? [{ type: run.runType, priority: run.recommendation.recommendedPriority as NursingPriority, rulesetVersion: run.ruleSetVersion.version, executedAt: run.completedAt, reasons: run.recommendation.reasons.map((reason) => reason.explanation) }] : []);
    const plan = patient.healthPlans[0];
    return {
      ticketCode: ticket.publicCode, status: triage.status as NursingTriageDetailDto["status"], displayName: patient.displayName, ageYears: ageAt(patient.birthDate, now), healthPlan: plan?.hasHealthPlan ? plan.planName ?? "Plano informado" : null,
      anamnesis: { mainComplaint: anamnesis.mainComplaint, additionalDescription: anamnesis.additionalDescription, subjectiveIntensity: anamnesis.subjectiveIntensity, symptomStartedAt: anamnesis.symptomStartedAt, approximateDuration: anamnesis.approximateDuration, declaredAllergies: anamnesis.declaredAllergies, declaredMedications: anamnesis.declaredMedications, declaredPreexistingConditions: anamnesis.declaredPreexistingConditions, demoAlerts: anamnesis.answers.map((answer) => ({ questionKey: answer.questionKey, answer: normalizedAnswer(answer.normalizedValue) })) },
      analyses, currentRecommendedPriority: triage.currentRecommendedPriority as NursingPriority,
      humanDecision: triage.nurseReviews[0] ? { priority: triage.nurseReviews[0].confirmedPriority as NursingPriority, decision: triage.nurseReviews[0].decision, justification: triage.nurseReviews[0].justification, reviewedAt: triage.nurseReviews[0].reviewedAt } : null,
      referral: triage.careReferrals[0] ? { destination: triage.careReferrals[0].destinationDescription, notes: triage.careReferrals[0].notes, referredAt: triage.careReferrals[0].referredAt } : null,
      collectionAttempts: triage.collectionSessions.map((session) => ({ attemptNumber: session.attemptNumber, origin: session.origin, status: session.status, startedAt: session.startedAt, readings: session.measurements.map((measurement) => ({ type: measurement.vitalSignType, value: measurement.numericValue, unit: measurement.unit, accepted: measurement.technicalStatus === "ACCEPTED" })) })),
      timeline: triage.auditEvents.map((event) => ({ label: timelineLabels[event.action], occurredAt: event.createdAt })).filter((event): event is { label: string; occurredAt: Date } => Boolean(event.label)),
    };
  }
}

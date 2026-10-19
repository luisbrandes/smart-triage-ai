import "server-only";

import { assertTriageTransition } from "@/domain/triage/triage-transitions";
import type { TriageStatus } from "@/domain/triage/triage-status";
import { prisma } from "@/server/db/prisma";
import { PatientIntakeNotFoundError, PatientIntakeStateError } from "@/server/application/patient-intake/patient-intake-errors";
import type { PatientIntakeRepository } from "@/server/application/patient-intake/patient-intake-repository";
import type { AnamnesisInput, ConsentInput, IdentificationInput, PatientIntakeSession } from "@/server/application/patient-intake/patient-intake-types";

function toSession(triage: { id: string; patientId: string | null; status: string }): PatientIntakeSession {
  return { triageId: triage.id, patientId: triage.patientId, status: triage.status as TriageStatus };
}

export class PrismaPatientIntakeRepository implements PatientIntakeRepository {
  async startTriage(): Promise<PatientIntakeSession> {
    return prisma.$transaction(async (transaction) => {
      assertTriageTransition("DRAFT", "IDENTIFICATION_IN_PROGRESS");
      const triage = await transaction.triage.create({
        data: { status: "IDENTIFICATION_IN_PROGRESS" },
        select: { id: true, patientId: true, status: true },
      });
      await transaction.auditEvent.create({
        data: {
          triageId: triage.id,
          entityType: "Triage",
          entityId: triage.id,
          action: "TRIAGE_STARTED",
          actorType: "PATIENT",
          sanitizedMetadata: { mode: "DEMO" },
        },
      });
      return toSession(triage);
    });
  }

  async startNewDemo(previousTriageId: string): Promise<PatientIntakeSession> {
    return prisma.$transaction(async (transaction) => {
      const previous = await transaction.triage.findUnique({ where: { id: previousTriageId }, select: { id: true, status: true } });
      if (!previous) throw new PatientIntakeNotFoundError();
      const activeSessions = await transaction.deviceCollectionSession.findMany({ where: { requestedByTriageId: previousTriageId, status: "ACTIVE" }, select: { id: true } });
      await transaction.deviceCollectionSession.updateMany({ where: { requestedByTriageId: previousTriageId, status: "ACTIVE" }, data: { status: "CANCELLED", cancelledAt: new Date() } });
      assertTriageTransition("DRAFT", "IDENTIFICATION_IN_PROGRESS");
      const triage = await transaction.triage.create({ data: { status: "IDENTIFICATION_IN_PROGRESS" }, select: { id: true, patientId: true, status: true } });
      await transaction.auditEvent.createMany({ data: [
        { triageId: triage.id, entityType: "Triage", entityId: triage.id, action: "TRIAGE_STARTED", actorType: "PATIENT", sanitizedMetadata: { mode: "DEMO" } },
        { triageId: triage.id, entityType: "Triage", entityId: triage.id, action: "NEW_DEMO_STARTED", actorType: "DEMO_OPERATOR", sanitizedMetadata: { previousTriageStatus: previous.status, triageStatus: triage.status } },
        ...activeSessions.map((session) => ({ triageId: previousTriageId, entityType: "DeviceCollectionSession", entityId: session.id, action: "DEVICE_COLLECTION_CANCELLED_FOR_NEW_TRIAGE", actorType: "PATIENT" as const, sanitizedMetadata: { reason: "NEW_TRIAGE" } })),
      ] });
      return toSession(triage);
    });
  }

  async requestRecollection(triageId: string): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      const triage = await transaction.triage.findUnique({ where: { id: triageId }, select: { status: true } });
      if (!triage) throw new PatientIntakeNotFoundError();
      if (triage.status === "RECOLLECTION_REQUESTED") return;
      if (triage.status !== "AWAITING_NURSE_REVIEW") throw new PatientIntakeStateError();
      assertTriageTransition("AWAITING_NURSE_REVIEW", "RECOLLECTION_REQUESTED");
      await transaction.triage.update({ where: { id: triageId }, data: { status: "RECOLLECTION_REQUESTED" } });
      await transaction.auditEvent.create({ data: { triageId, entityType: "Triage", entityId: triageId, action: "VITAL_SIGNS_RECOLLECTION_REQUESTED", actorType: "PATIENT", sanitizedMetadata: { previousStatus: "AWAITING_NURSE_REVIEW", nextStatus: "RECOLLECTION_REQUESTED" } } });
    });
  }

  async cancelTriage(triageId: string): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      const triage = await transaction.triage.findUnique({ where: { id: triageId }, select: { status: true } });
      if (!triage) throw new PatientIntakeNotFoundError();
      const cancellable = ["DRAFT", "IDENTIFICATION_IN_PROGRESS", "ANAMNESIS_IN_PROGRESS", "VITAL_SIGNS_REQUIRED", "VITAL_SIGNS_IN_PROGRESS", "FINAL_ANALYSIS_PENDING", "RECOLLECTION_REQUESTED"].includes(triage.status);
      if (!cancellable || triage.status === "CANCELLED") return;
      assertTriageTransition(triage.status as TriageStatus, "CANCELLED");
      const activeSessions = await transaction.deviceCollectionSession.findMany({ where: { requestedByTriageId: triageId, status: "ACTIVE" }, select: { id: true } });
      await transaction.deviceCollectionSession.updateMany({ where: { requestedByTriageId: triageId, status: "ACTIVE" }, data: { status: "CANCELLED", cancelledAt: new Date() } });
      await transaction.triage.update({ where: { id: triageId }, data: { status: "CANCELLED", cancelledAt: new Date() } });
      await transaction.auditEvent.createMany({ data: [
        { triageId, entityType: "Triage", entityId: triageId, action: "TRIAGE_CANCELLED", actorType: "PATIENT", sanitizedMetadata: { previousStatus: triage.status, nextStatus: "CANCELLED", reason: "PATIENT_ABORTED" } },
        ...activeSessions.map((session) => ({ triageId, entityType: "DeviceCollectionSession", entityId: session.id, action: "DEVICE_COLLECTION_CANCELLED", actorType: "PATIENT" as const, sanitizedMetadata: { reason: "TRIAGE_CANCELLED" } })),
      ] });
    });
  }

  async findSession(triageId: string): Promise<PatientIntakeSession | null> {
    const triage = await prisma.triage.findUnique({ where: { id: triageId }, select: { id: true, patientId: true, status: true } });
    return triage ? toSession(triage) : null;
  }

  async saveIdentification(triageId: string, input: IdentificationInput): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      // Serializa tentativas da mesma triagem: um retry após commit deve retomar
      // o fluxo, sem criar um segundo Patient/HealthPlanInformation.
      await transaction.$queryRaw`SELECT "id" FROM "Triage" WHERE "id" = ${triageId} FOR UPDATE`;
      const triage = await transaction.triage.findUnique({ where: { id: triageId }, select: { id: true, patientId: true, status: true } });
      if (!triage) throw new PatientIntakeNotFoundError();
      if (triage.status !== "IDENTIFICATION_IN_PROGRESS") throw new PatientIntakeStateError();
      if (triage.patientId) return;

      const patient = await transaction.patient.create({
        data: {
          displayName: input.displayName,
          birthDate: input.birthDate,
          sex: input.sex,
          documentReference: input.documentReference,
          healthPlans: { create: { hasHealthPlan: input.hasHealthPlan, planName: input.hasHealthPlan ? input.planName : null } },
        },
      });
      await transaction.triage.update({ where: { id: triageId }, data: { patientId: patient.id } });
      await transaction.auditEvent.create({
        data: {
          triageId,
          entityType: "Triage",
          entityId: triageId,
          action: "IDENTIFICATION_SAVED",
          actorType: "PATIENT",
          sanitizedMetadata: { hasHealthPlan: input.hasHealthPlan, mode: "DEMO" },
        },
      });
    });
  }

  async acceptConsent(triageId: string, input: ConsentInput): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      const triage = await transaction.triage.findUnique({ where: { id: triageId }, select: { id: true, patientId: true, status: true } });
      if (!triage) throw new PatientIntakeNotFoundError();
      if (triage.status !== "IDENTIFICATION_IN_PROGRESS" || !triage.patientId) throw new PatientIntakeStateError();
      assertTriageTransition("IDENTIFICATION_IN_PROGRESS", "ANAMNESIS_IN_PROGRESS");

      await transaction.consentRecord.create({
        data: {
          patientId: triage.patientId,
          triageId,
          termsVersion: input.termsVersion,
          acceptedAt: input.acceptedAt,
          acceptanceOrigin: "PATIENT_DEMO_WEB",
          status: "ACCEPTED",
        },
      });
      await transaction.triage.update({ where: { id: triageId }, data: { status: "ANAMNESIS_IN_PROGRESS" } });
      await transaction.auditEvent.create({
        data: {
          triageId,
          entityType: "ConsentRecord",
          entityId: triageId,
          action: "CONSENT_ACCEPTED",
          actorType: "PATIENT",
          sanitizedMetadata: { termsVersion: input.termsVersion, mode: "DEMO" },
        },
      });
    });
  }

  async completeAnamnesis(triageId: string, input: AnamnesisInput): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      const triage = await transaction.triage.findUnique({ where: { id: triageId }, select: { id: true, patientId: true, status: true } });
      if (!triage) throw new PatientIntakeNotFoundError();
      if (triage.status !== "ANAMNESIS_IN_PROGRESS" || !triage.patientId) throw new PatientIntakeStateError();
      assertTriageTransition("ANAMNESIS_IN_PROGRESS", "VITAL_SIGNS_REQUIRED");

      const anamnesis = await transaction.anamnesis.create({
        data: {
          triageId,
          version: 1,
          mainComplaint: input.mainComplaint,
          additionalDescription: input.additionalDescription,
          subjectiveIntensity: input.subjectiveIntensity,
          approximateDuration: input.approximateDuration,
          declaredAllergies: input.declaredAllergies,
          declaredMedications: input.declaredMedications,
          declaredPreexistingConditions: input.declaredPreexistingConditions,
          answers: {
            create: Object.entries(input.alertAnswers).map(([questionKey, answer]) => ({
              questionKey,
              questionVersion: input.catalogVersion,
              normalizedValue: answer,
            })),
          },
        },
      });
      await transaction.auditEvent.createMany({
        data: [
          {
            triageId,
            entityType: "Anamnesis",
            entityId: anamnesis.id,
            action: "ANAMNESIS_SAVED",
            actorType: "PATIENT",
            sanitizedMetadata: { catalogVersion: input.catalogVersion, answerCount: Object.keys(input.alertAnswers).length, mode: "DEMO" },
          },
          {
            triageId,
            entityType: "Triage",
            entityId: triageId,
            action: "ANAMNESIS_COMPLETED",
            actorType: "PATIENT",
            sanitizedMetadata: { mode: "DEMO" },
          },
        ],
      });
      await transaction.triage.update({ where: { id: triageId }, data: { status: "VITAL_SIGNS_REQUIRED" } });
    });
  }
}

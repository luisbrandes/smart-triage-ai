import { describe, expect, it } from "vitest";

import { acceptPatientConsent, savePatientIdentification, startPatientTriage } from "@/server/application/patient-intake/patient-intake-use-cases";
import { routeForPatientIntakeStatus } from "@/server/application/patient-intake/patient-intake-routes";
import { prisma } from "@/server/db/prisma";
import { PrismaPatientIntakeRepository } from "@/server/repositories/prisma-patient-intake-repository";

describe("PostgreSQL: persistência da identificação", () => {
  it("persiste paciente, plano e auditoria e trata retry concorrente sem duplicar registros", async () => {
    const repository = new PrismaPatientIntakeRepository();
    const triage = await startPatientTriage(repository);
    const input = {
      displayName: "Pessoa Fictícia de Integração",
      birthDate: "1990-01-01",
      hasHealthPlan: "yes",
      planName: "Plano Fictício de Teste",
    };

    const results = await Promise.all([
      savePatientIdentification(repository, triage.triageId, input),
      savePatientIdentification(repository, triage.triageId, input),
    ]);

    expect(results).toEqual([{ success: true }, { success: true }]);

    const persisted = await prisma.triage.findUniqueOrThrow({
      where: { id: triage.triageId },
      select: {
        patientId: true,
        patient: { select: { displayName: true, healthPlans: { select: { hasHealthPlan: true, planName: true } } } },
        auditEvents: { where: { action: "IDENTIFICATION_SAVED" }, select: { id: true } },
      },
    });

    expect(persisted.patientId).toBeTruthy();
    expect(persisted.patient).toMatchObject({
      displayName: input.displayName,
      healthPlans: [{ hasHealthPlan: true, planName: input.planName }],
    });
    expect(persisted.auditEvents).toHaveLength(1);
    expect(await prisma.patient.count({ where: { triages: { some: { id: triage.triageId } } } })).toBe(1);

    const reloaded = await repository.findSession(triage.triageId);
    expect(reloaded).toEqual({
      triageId: triage.triageId,
      patientId: persisted.patientId,
      status: "IDENTIFICATION_IN_PROGRESS",
    });
    expect(routeForPatientIntakeStatus(reloaded!.status, Boolean(reloaded!.patientId)))
      .toBe("/paciente/triagem/consentimento");

    expect(await acceptPatientConsent(repository, triage.triageId, { accepted: "yes" }))
      .toEqual({ success: true });
    const afterConsent = await repository.findSession(triage.triageId);
    expect(afterConsent?.patientId).toBe(persisted.patientId);
    expect(afterConsent?.status).toBe("ANAMNESIS_IN_PROGRESS");
    expect(routeForPatientIntakeStatus(afterConsent!.status, Boolean(afterConsent!.patientId)))
      .toBe("/paciente/triagem/anamnese");
  });

  it("persists an explicit no-plan answer and exposes the committed patient after reread", async () => {
    const repository = new PrismaPatientIntakeRepository();
    const triage = await startPatientTriage(repository);
    const result = await savePatientIdentification(repository, triage.triageId, {
      displayName: "Pessoa Fictícia sem Plano",
      birthDate: "1992-02-03",
      hasHealthPlan: "no",
    });

    expect(result).toEqual({ success: true });

    const persisted = await prisma.triage.findUniqueOrThrow({
      where: { id: triage.triageId },
      select: {
        patientId: true,
        patient: { select: { healthPlans: { select: { hasHealthPlan: true, planName: true } } } },
        auditEvents: { where: { action: "IDENTIFICATION_SAVED" }, select: { id: true } },
      },
    });
    expect(persisted.patientId).toBeTruthy();
    expect(persisted.patient?.healthPlans).toEqual([{ hasHealthPlan: false, planName: null }]);
    expect(persisted.auditEvents).toHaveLength(1);

    const reloaded = await repository.findSession(triage.triageId);
    expect(reloaded?.patientId).toBe(persisted.patientId);
    expect(routeForPatientIntakeStatus(reloaded!.status, Boolean(reloaded!.patientId)))
      .toBe("/paciente/triagem/consentimento");
  });
});

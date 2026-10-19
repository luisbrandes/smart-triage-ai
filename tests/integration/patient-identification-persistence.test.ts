import { describe, expect, it } from "vitest";

import { savePatientIdentification, startPatientTriage } from "@/server/application/patient-intake/patient-intake-use-cases";
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
  });
});

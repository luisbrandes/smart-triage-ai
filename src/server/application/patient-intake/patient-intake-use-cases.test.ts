import { describe, expect, it } from "vitest";

import type { PatientIntakeRepository } from "@/server/application/patient-intake/patient-intake-repository";
import type { AnamnesisInput, ConsentInput, IdentificationInput, PatientIntakeSession } from "@/server/application/patient-intake/patient-intake-types";
import { cancelPatientTriage, completePatientAnamnesis, requestPatientRecollection, startNewPatientDemo } from "@/server/application/patient-intake/patient-intake-use-cases";

class IntakeRepositorySpy implements PatientIntakeRepository {
  completedInput: AnamnesisInput | null = null;
  previousTriageId: string | null = null;
  recollectionTriageId: string | null = null;
  cancelledTriageId: string | null = null;

  async startTriage(): Promise<PatientIntakeSession> {
    return { triageId: "demo-triage", patientId: null, status: "IDENTIFICATION_IN_PROGRESS" };
  }
  async startNewDemo(previousTriageId: string): Promise<PatientIntakeSession> {
    this.previousTriageId = previousTriageId;
    return { triageId: "new-demo-triage", patientId: null, status: "IDENTIFICATION_IN_PROGRESS" };
  }
  async requestRecollection(triageId: string): Promise<void> { this.recollectionTriageId = triageId; }
  async cancelTriage(triageId: string): Promise<void> { this.cancelledTriageId = triageId; }
  async findSession(): Promise<PatientIntakeSession | null> { return null; }
  async saveIdentification(triageId: string, input: IdentificationInput): Promise<void> { void triageId; void input; }
  async acceptConsent(triageId: string, input: ConsentInput): Promise<void> { void triageId; void input; }
  async completeAnamnesis(_triageId: string, input: AnamnesisInput): Promise<void> { this.completedInput = input; }
}

describe("conclusão da anamnese", () => {
  it("valida e encaminha o catálogo completo ao repository", async () => {
    const repository = new IntakeRepositorySpy();
    const result = await completePatientAnamnesis(repository, "demo-triage", {
      mainComplaint: "Queixa fictícia de demonstração",
      subjectiveIntensity: "5",
      approximateDuration: "Duração fictícia",
      alertAnswers: {
        DEMO_ALERT_SUDDEN_CHANGE: "no",
        DEMO_ALERT_BREATHING: "no",
        DEMO_ALERT_CONSCIOUSNESS: "no",
      },
    });

    expect(result.success).toBe(true);
    expect(repository.completedInput?.catalogVersion).toContain("DEMO");
    expect(Object.keys(repository.completedInput?.alertAnswers ?? {})).toHaveLength(3);
  });
});

describe("nova demonstração", () => {
  it("cria outra sessão referenciando a triagem anterior sem reutilizá-la", async () => {
    const repository = new IntakeRepositorySpy();
    const result = await startNewPatientDemo(repository, "previous-demo-triage");
    expect(repository.previousTriageId).toBe("previous-demo-triage");
    expect(result.triageId).toBe("new-demo-triage");
    expect(result.triageId).not.toBe(repository.previousTriageId);
  });
});

it("solicita nova coleta para a mesma triagem", async () => {
  const repository = new IntakeRepositorySpy();
  await requestPatientRecollection(repository, "same-triage");
  expect(repository.recollectionTriageId).toBe("same-triage");
});

it("encaminha o encerramento da triagem ao repository", async () => {
  const repository = new IntakeRepositorySpy();
  await cancelPatientTriage(repository, "cancelled-triage");
  expect(repository.cancelledTriageId).toBe("cancelled-triage");
});

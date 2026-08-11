import { describe, expect, it } from "vitest";

import type { NursingMutationRepository } from "@/server/application/nursing/nursing-mutation-repository";
import type { ClassificationInput, RecollectionInput, ReferralInput } from "@/server/application/nursing/nursing-mutation-types";
import { callNextPatient, completePatientCare, confirmTriageClassification, reclassifyTriage, referTriageToCare, requestVitalSignsRecollection, startPatientCare } from "@/server/application/nursing/nursing-mutations";

class MutationSpy implements NursingMutationRepository {
  calls: { action: string; input?: unknown }[] = [];
  async confirmClassification() { this.calls.push({ action: "confirm" }); }
  async reclassify(_id: string, input: ClassificationInput) { this.calls.push({ action: "reclassify", input }); }
  async requestRecollection(_id: string, input: RecollectionInput) { this.calls.push({ action: "recollection", input }); }
  async referToCare(_id: string, input: ReferralInput) { this.calls.push({ action: "referral", input }); }
  async callNext() { this.calls.push({ action: "call-next" }); return { triageId: "triage", ticketCode: "T-001" }; }
  async startCare() { this.calls.push({ action: "start-care" }); }
  async completeCare() { this.calls.push({ action: "complete-care" }); }
}

describe("ações profissionais", () => {
  it("confirma a recomendação e envia para a fila de atendimento", async () => { const repository = new MutationSpy(); expect(await confirmTriageClassification(repository, "triage", "nurse-demo")).toEqual({ success: true, status: "CARE_WAITING" }); expect(repository.calls).toEqual([{ action: "confirm" }]); });
  it("reclassifica com prioridade e justificativa", async () => { const repository = new MutationSpy(); const result = await reclassifyTriage(repository, "triage", { priority: "RED", justification: "Revisão profissional fictícia." }, "nurse-demo"); expect(result.success).toBe(true); expect(repository.calls[0]).toMatchObject({ action: "reclassify", input: { priority: "RED" } }); });
  it("bloqueia reclassificação sem justificativa antes do repository", async () => { const repository = new MutationSpy(); const result = await reclassifyTriage(repository, "triage", { priority: "RED", justification: "" }, "nurse-demo"); expect(result.success).toBe(false); expect(repository.calls).toHaveLength(0); });
  it("exige motivo para nova coleta", async () => { const repository = new MutationSpy(); expect((await requestVitalSignsRecollection(repository, "triage", { reason: "" }, "nurse-demo")).success).toBe(false); expect(repository.calls).toHaveLength(0); });
  it("solicita nova coleta sem criar sessão no caso de uso", async () => { const repository = new MutationSpy(); const result = await requestVitalSignsRecollection(repository, "triage", { reason: "Repetir leitura fictícia" }, "nurse-demo"); expect(result).toEqual({ success: true, status: "RECOLLECTION_REQUESTED" }); expect(repository.calls).toHaveLength(1); });
  it("encaminha com campos opcionais limitados", async () => { const repository = new MutationSpy(); expect((await referTriageToCare(repository, "triage", { destination: "Atendimento fictício", notes: "Observação fictícia" }, "nurse-demo")).success).toBe(true); expect(repository.calls[0].action).toBe("referral"); });
  it("rejeita observação excessiva sem mutação", async () => { const repository = new MutationSpy(); expect((await referTriageToCare(repository, "triage", { notes: "x".repeat(501) }, "nurse-demo")).success).toBe(false); expect(repository.calls).toHaveLength(0); });
  it("chama a próxima senha elegível", async () => { const repository = new MutationSpy(); expect(await callNextPatient(repository, "nurse-demo")).toEqual({ success: true, status: "CALLED", ticketCode: "T-001" }); });
  it("registra início e conclusão do atendimento", async () => { const repository = new MutationSpy(); expect(await startPatientCare(repository, "triage", "nurse-demo")).toEqual({ success: true, status: "IN_SERVICE" }); expect(await completePatientCare(repository, "triage", "nurse-demo")).toEqual({ success: true, status: "COMPLETED" }); });
});

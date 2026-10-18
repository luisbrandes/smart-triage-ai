import { describe, expect, it } from "vitest";
import { callNextPatient, completePatientCare, confirmTriageClassification, reclassifyTriage, referTriageToCare, requestVitalSignsRecollection, startPatientCare } from "@/server/application/nursing/nursing-mutations";
import type { NursingMutationRepository } from "@/server/application/nursing/nursing-mutation-repository";

class MutationSpy implements NursingMutationRepository {
  calls: string[] = [];
  async confirmClassification() { this.calls.push("confirm"); }
  async reclassify() { this.calls.push("reclassify"); }
  async requestRecollection() { this.calls.push("recollect"); }
  async referToCare() { this.calls.push("refer"); }
  async callNext() { this.calls.push("call"); return { triageId: "triage", ticketCode: "T-001" }; }
  async startCare() { this.calls.push("start"); }
  async completeCare() { this.calls.push("complete"); }
}

describe("ações da fila de enfermagem", () => {
  it("confirma a recomendação e entra em CLASSIFIED", async () => { const repository = new MutationSpy(); await expect(confirmTriageClassification(repository, "triage", "nurse-demo")).resolves.toEqual({ success: true, status: "CLASSIFIED" }); });
  it("encaminha, chama e conclui o fluxo operacional", async () => { const repository = new MutationSpy(); await expect(referTriageToCare(repository, "triage", {} , "nurse-demo")).resolves.toMatchObject({ success: true, status: "REFERRED_TO_CARE" }); await expect(callNextPatient(repository, "nurse-demo")).resolves.toMatchObject({ success: true, status: "CALLED" }); await expect(startPatientCare(repository, "triage", "nurse-demo")).resolves.toEqual({ success: true, status: "IN_SERVICE" }); await expect(completePatientCare(repository, "triage", "nurse-demo")).resolves.toEqual({ success: true, status: "COMPLETED" }); });
  it("reclassifica com justificativa", async () => { const repository = new MutationSpy(); await expect(reclassifyTriage(repository, "triage", { priority: "RED", justification: "Revisão profissional fictícia." }, "nurse-demo")).resolves.toMatchObject({ success: true, status: "CLASSIFIED" }); });
  it("valida nova coleta antes do repository", async () => { const repository = new MutationSpy(); await expect(requestVitalSignsRecollection(repository, "triage", { reason: "" }, "nurse-demo")).resolves.toMatchObject({ success: false }); expect(repository.calls).toHaveLength(0); });
});

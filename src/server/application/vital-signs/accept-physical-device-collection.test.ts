import { describe, expect, it } from "vitest";

import { acceptPhysicalDeviceCollectionForTriage } from "@/server/application/vital-signs/accept-physical-device-collection";
import { VitalSignsFlowError } from "@/server/application/vital-signs/vital-signs-errors";
import type { VitalSignsRepository } from "@/server/application/vital-signs/vital-signs-repository";

const input = { deviceCollectionSessionId: "00000000-0000-4000-8000-000000000001", readingId: "00000000-0000-4000-8000-000000000002" };

class RepositorySpy implements VitalSignsRepository {
  received: unknown;
  constructor(private readonly response: Awaited<ReturnType<VitalSignsRepository["acceptPhysicalDeviceCollection"]>>) {}
  async acceptPhysicalDeviceCollection(value: Parameters<VitalSignsRepository["acceptPhysicalDeviceCollection"]>[0]) { this.received = value; return this.response; }
  async recordAttempt(): Promise<never> { throw new Error("not used"); }
  async getFlow(): Promise<never> { throw new Error("not used"); }
  async completeAndAnalyze(): Promise<never> { throw new Error("not used"); }
  async findLatestFinalAnalysis(): Promise<never> { throw new Error("not used"); }
}

describe("aceite de coleta física", () => {
  it("aceita uma leitura física válida para a triagem atual", async () => {
    const repository = new RepositorySpy({ kind: "ACCEPTED", collectionSessionId: "clinical-session", alreadyAccepted: false });
    await expect(acceptPhysicalDeviceCollectionForTriage(repository, "triage-1", input)).resolves.toEqual({ collectionSessionId: "clinical-session", alreadyAccepted: false });
    expect(repository.received).toEqual({ triageId: "triage-1", ...input });
  });

  it("é idempotente para a mesma reading", async () => {
    const repository = new RepositorySpy({ kind: "ACCEPTED", collectionSessionId: "clinical-session", alreadyAccepted: true });
    await expect(acceptPhysicalDeviceCollectionForTriage(repository, "triage-1", input)).resolves.toMatchObject({ alreadyAccepted: true });
  });

  it.each([
    "A leitura não pertence a esta sessão de coleta.",
    "A leitura não possui sessionId.",
    "Sessão de coleta não encontrada.",
    "Triagem não encontrada.",
    "A triagem não está pronta para confirmar esta coleta.",
    "A leitura não possui frequência cardíaca válida.",
    "A leitura não possui saturação válida.",
  ])("rejeita de forma segura: %s", async (message) => {
    const repository = new RepositorySpy({ kind: "REJECTED", message });
    await expect(acceptPhysicalDeviceCollectionForTriage(repository, "triage-1", input)).rejects.toBeInstanceOf(VitalSignsFlowError);
  });

  it("rejeita IDs técnicos inválidos", async () => {
    const repository = new RepositorySpy({ kind: "ACCEPTED", collectionSessionId: "clinical-session", alreadyAccepted: false });
    await expect(acceptPhysicalDeviceCollectionForTriage(repository, "triage-1", { ...input, readingId: "invalido" })).rejects.toBeInstanceOf(VitalSignsFlowError);
  });
});

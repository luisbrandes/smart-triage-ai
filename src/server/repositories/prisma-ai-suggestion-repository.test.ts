import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  findMany: vi.fn(),
  updateMany: vi.fn(),
  findUniqueOrThrow: vi.fn(),
  auditCreate: vi.fn(),
  transaction: vi.fn(),
}));
vi.mock("@/server/db/prisma", () => ({
  prisma: {
    aiSuggestion: { findMany: mocks.findMany },
    $transaction: mocks.transaction,
  },
}));

import { PrismaAiSuggestionRepository } from "@/server/repositories/prisma-ai-suggestion-repository";

const result = {
  suggestion: "YELLOW" as const,
  attention: "MODERATE" as const,
  summary: "Sugestão amarela com nível de atenção moderada.",
  indicators: [{ key: "spo2", label: "SpO₂", value: "94%" }],
  explanation: "O modelo selecionou SpO₂ entre os dados enviados.",
  dataConsidered: [{ key: "spo2", label: "SpO₂", value: "94%" }, { key: "weight", label: "Peso", value: "Não informado" }],
  limitations: ["Sugestão experimental."],
};

describe("Prisma AI suggestion persistence mapping", () => {
  beforeEach(() => vi.clearAllMocks());

  it("persists the structured result in the existing JSON field without schema changes", async () => {
    const tx = {
      aiSuggestion: { updateMany: mocks.updateMany, findUniqueOrThrow: mocks.findUniqueOrThrow },
      auditEvent: { create: mocks.auditCreate },
    };
    mocks.transaction.mockImplementation(async (work: (transaction: typeof tx) => Promise<unknown>) => work(tx));
    mocks.updateMany.mockResolvedValue({ count: 1 });
    mocks.findUniqueOrThrow.mockResolvedValue({ id: "fake-suggestion" });

    await expect(new PrismaAiSuggestionRepository().save("fake-triage", "fake-run", "fake-claim", result, "FAKE_NURSE")).resolves.toBe(true);
    const savedData = mocks.updateMany.mock.calls[0][0].data;
    expect(savedData.suggestedPriority).toBe("YELLOW");
    expect(savedData.conclusion).toBe(result.summary);
    expect(savedData.factors).toMatchObject({ indicators: result.indicators, explanation: result.explanation, dataConsidered: result.dataConsidered, limitations: result.limitations });
  });

  it("loads the structured response and remains compatible with legacy factor arrays", async () => {
    mocks.findMany.mockResolvedValue([
      { id: "new", analysisRunId: "run-new", status: "COMPLETED", suggestedPriority: "YELLOW", attentionLevel: "MODERATE", conclusion: result.summary, factors: result, model: "fake-model", createdAt: new Date(0), collectionSession: { attemptNumber: 2 } },
      { id: "old", analysisRunId: "run-old", status: "COMPLETED", suggestedPriority: "GREEN", attentionLevel: "LOW", conclusion: "Resumo legado", factors: ["Queixa fictícia"], model: "fake-model", createdAt: new Date(0), collectionSession: { attemptNumber: 1 } },
    ]);

    const items = await new PrismaAiSuggestionRepository().list("fake-triage");
    expect(items[0]).toMatchObject({ summary: result.summary, indicators: result.indicators, dataConsidered: result.dataConsidered, explanation: result.explanation, limitations: result.limitations });
    expect(items[1]).toMatchObject({ summary: "Resumo legado", indicators: [{ label: "Indicativo retornado pelo modelo", value: "Queixa fictícia" }], dataConsidered: [], explanation: null });
  });
});

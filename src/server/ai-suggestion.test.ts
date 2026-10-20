import { afterEach, describe, expect, it, vi } from "vitest";

const { latestContext, list, claim, save, requestGroqSuggestion } = vi.hoisted(() => ({
  latestContext: vi.fn(),
  list: vi.fn(),
  claim: vi.fn(),
  save: vi.fn(),
  requestGroqSuggestion: vi.fn(),
}));

vi.mock("@/server/repositories/prisma-ai-suggestion-repository", () => ({
  PrismaAiSuggestionRepository: class {
    latestContext = latestContext;
    list = list;
    claim = claim;
    save = save;
  },
}));
vi.mock("@/server/services/ai/groq-suggestion", () => ({ requestGroqSuggestion }));

import { aiSuggestion } from "@/server/ai-suggestion";

const context = {
  analysisRunId: "analysis-id",
  collectionSessionId: "collection-id",
  input: {
    ageYears: 40, sex: null, mainComplaint: "Queixa fictícia", subjectiveIntensity: 4,
    approximateDuration: null, reportedAlerts: [], bpm: 80, spo2: 98, temperature: null,
    weight: null, height: null, systemPriority: "GREEN" as const,
  },
};

afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllEnvs();
});

describe("aiSuggestion.generate", () => {
  it("persists UNAVAILABLE for a failed provider response and does not retry the same analysis", async () => {
    vi.stubEnv("APP_MODE", "demo");
    vi.stubEnv("GROQ_API_KEY", "fake-test-key");
    latestContext.mockResolvedValue(context);
    claim.mockResolvedValue({ kind: "CLAIMED", claimToken: "claim-token" });
    requestGroqSuggestion.mockResolvedValue(null);
    save.mockResolvedValue(true);

    await expect(aiSuggestion.generate("triage-id", "NURSE_SESSION")).resolves.toBe("UNAVAILABLE");
    expect(save).toHaveBeenCalledWith("triage-id", "analysis-id", "claim-token", null, "NURSE_SESSION");

    claim.mockResolvedValue({ kind: "ALREADY_EXISTS" });
    await expect(aiSuggestion.generate("triage-id", "NURSE_SESSION")).resolves.toBe("ALREADY_EXISTS");
    expect(requestGroqSuggestion).toHaveBeenCalledTimes(1);
  });

  it("records an unavailable result without calling Groq when no key is configured", async () => {
    vi.stubEnv("APP_MODE", "demo");
    vi.stubEnv("GROQ_API_KEY", "");
    latestContext.mockResolvedValue(context);
    claim.mockResolvedValue({ kind: "CLAIMED", claimToken: "claim-token" });
    requestGroqSuggestion.mockResolvedValue(null);
    save.mockResolvedValue(true);

    await expect(aiSuggestion.generate("triage-id", "NURSE_SESSION")).resolves.toBe("UNAVAILABLE");
    expect(requestGroqSuggestion).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith("triage-id", "analysis-id", "claim-token", null, "NURSE_SESSION");
  });

  it("returns a safe persistence result when context or duplicate lookup fails", async () => {
    latestContext.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(aiSuggestion.generate("triage-id", "NURSE_SESSION")).resolves.toBe("PERSISTENCE_ERROR");

    latestContext.mockResolvedValueOnce(context);
    claim.mockRejectedValueOnce(new Error("database unavailable"));
    await expect(aiSuggestion.generate("triage-id", "NURSE_SESSION")).resolves.toBe("PERSISTENCE_ERROR");
    expect(requestGroqSuggestion).not.toHaveBeenCalled();
  });

  it("persists UNAVAILABLE if the provider adapter throws unexpectedly", async () => {
    vi.stubEnv("APP_MODE", "demo");
    latestContext.mockResolvedValue(context);
    claim.mockResolvedValue({ kind: "CLAIMED", claimToken: "claim-token" });
    requestGroqSuggestion.mockRejectedValue(new Error("provider failed"));
    save.mockResolvedValue(true);

    await expect(aiSuggestion.generate("triage-id", "NURSE_SESSION")).resolves.toBe("UNAVAILABLE");
    expect(save).toHaveBeenCalledWith("triage-id", "analysis-id", "claim-token", null, "NURSE_SESSION");
  });
});

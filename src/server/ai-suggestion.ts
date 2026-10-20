import "server-only";

import { PrismaAiSuggestionRepository } from "@/server/repositories/prisma-ai-suggestion-repository";
import { requestGroqSuggestion } from "@/server/services/ai/groq-suggestion";
import { logServerOperation } from "@/server/observability/server-logger";
import type { AiSuggestionResult } from "@/server/application/ai-suggestion/ai-suggestion-types";

const repository = new PrismaAiSuggestionRepository();

function logFailure(operation: string, error: unknown): void {
  const errorCode = error instanceof Error && "code" in error && typeof error.code === "string"
    ? error.code
    : error instanceof Error ? error.name : "UNKNOWN_ERROR";
  logServerOperation({ operation, correlationId: crypto.randomUUID(), actorType: "NURSE", entity: "AiSuggestion", result: "FAILURE", errorCode });
}

export const aiSuggestion = {
  async list(triageId: string) {
    try {
      return await repository.list(triageId);
    } catch (error) {
      const errorCode = error instanceof Error && "code" in error && typeof error.code === "string"
        ? error.code
        : error instanceof Error ? error.name : "UNKNOWN_ERROR";
      logServerOperation({
        operation: "ai-suggestion-list",
        correlationId: crypto.randomUUID(),
        actorType: "SYSTEM",
        entity: "AiSuggestion",
        result: "FAILURE",
        errorCode,
      });
      return [];
    }
  },
  async generate(triageId: string, actorReference: string): Promise<"SAVED" | "UNAVAILABLE" | "ALREADY_EXISTS" | "IN_PROGRESS" | "INSUFFICIENT_DATA" | "PERSISTENCE_ERROR"> {
    let context: Awaited<ReturnType<typeof repository.latestContext>>;
    try {
      context = await repository.latestContext(triageId);
      if (!context) return "INSUFFICIENT_DATA";
    } catch (error) {
      logFailure("ai-suggestion-context", error);
      return "PERSISTENCE_ERROR";
    }
    if (!context) return "INSUFFICIENT_DATA";

    let claim: Awaited<ReturnType<typeof repository.claim>>;
    try {
      claim = await repository.claim(triageId, context.analysisRunId, context.collectionSessionId, actorReference);
    } catch (error) {
      logFailure("ai-suggestion-claim", error);
      return "PERSISTENCE_ERROR";
    }
    if (claim.kind !== "CLAIMED") return claim.kind;

    let result: AiSuggestionResult | null = null;
    if (process.env.APP_MODE === "demo") {
      try {
        result = await requestGroqSuggestion(context.input, fetch, triageId);
      } catch (error) {
        logFailure("ai-suggestion-provider", error);
      }
    }
    try {
      const saved = await repository.save(triageId, context.analysisRunId, claim.claimToken, result, actorReference);
      if (!saved) return "IN_PROGRESS";
      return result ? "SAVED" : "UNAVAILABLE";
    } catch (error) {
      logFailure("ai-suggestion-save", error);
      return "PERSISTENCE_ERROR";
    }
  },
};

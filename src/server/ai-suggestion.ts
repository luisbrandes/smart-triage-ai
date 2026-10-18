import "server-only";

import { PrismaAiSuggestionRepository } from "@/server/repositories/prisma-ai-suggestion-repository";
import { requestGroqSuggestion } from "@/server/services/ai/groq-suggestion";
import { logServerOperation } from "@/server/observability/server-logger";

const repository = new PrismaAiSuggestionRepository();

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
  async generate(triageId: string, actorReference: string): Promise<"SAVED" | "ALREADY_EXISTS" | "INSUFFICIENT_DATA" | "NOT_CONFIGURED" | "PROVIDER_UNAVAILABLE" | "PERSISTENCE_ERROR"> {
    if (process.env.APP_MODE !== "demo" || !process.env.GROQ_API_KEY) return "NOT_CONFIGURED";
    const context = await repository.latestContext(triageId);
    if (!context) return "INSUFFICIENT_DATA";
    const existing = await repository.list(triageId);
    if (existing.some((item) => item.analysisRunId === context.analysisRunId)) return "ALREADY_EXISTS";
    const result = await requestGroqSuggestion(context.input);
    if (!result) return "PROVIDER_UNAVAILABLE";
    try {
      await repository.save(triageId, context.analysisRunId, context.collectionSessionId, result, actorReference);
      return "SAVED";
    } catch (error) {
      const errorCode = error instanceof Error && "code" in error && typeof error.code === "string" ? error.code : error instanceof Error ? error.name : "UNKNOWN_ERROR";
      logServerOperation({ operation: "ai-suggestion-save", correlationId: crypto.randomUUID(), actorType: "NURSE", entity: "AiSuggestion", result: "FAILURE", errorCode });
      return "PERSISTENCE_ERROR";
    }
  },
};

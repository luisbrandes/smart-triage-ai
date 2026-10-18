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
  async generate(triageId: string, actorReference: string): Promise<boolean> {
    const context = await repository.latestContext(triageId);
    if (!context) return false;
    const existing = await repository.list(triageId);
    if (existing.some((item) => item.analysisRunId === context.analysisRunId)) return true;
    const result = await requestGroqSuggestion(context.input);
    await repository.save(triageId, context.analysisRunId, context.collectionSessionId, result, actorReference);
    return true;
  },
};

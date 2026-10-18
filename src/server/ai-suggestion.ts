import "server-only";

import { PrismaAiSuggestionRepository } from "@/server/repositories/prisma-ai-suggestion-repository";
import { requestGroqSuggestion } from "@/server/services/ai/groq-suggestion";

const repository = new PrismaAiSuggestionRepository();

export const aiSuggestion = {
  list: (triageId: string) => repository.list(triageId),
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

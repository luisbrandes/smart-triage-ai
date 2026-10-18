CREATE TYPE "AiSuggestionStatus" AS ENUM ('COMPLETED', 'UNAVAILABLE');
CREATE TYPE "AiSuggestedPriority" AS ENUM ('RED', 'YELLOW', 'GREEN', 'BLUE');
CREATE TYPE "AiAttentionLevel" AS ENUM ('HIGH', 'MODERATE', 'LOW');

CREATE TABLE "AiSuggestion" (
    "id" TEXT NOT NULL,
    "triageId" TEXT NOT NULL,
    "analysisRunId" TEXT NOT NULL,
    "collectionSessionId" TEXT NOT NULL,
    "status" "AiSuggestionStatus" NOT NULL,
    "suggestedPriority" "AiSuggestedPriority",
    "attentionLevel" "AiAttentionLevel",
    "conclusion" TEXT,
    "factors" JSONB,
    "model" TEXT NOT NULL,
    "promptVersion" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "AiSuggestion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiSuggestion_analysisRunId_key" ON "AiSuggestion"("analysisRunId");
CREATE INDEX "AiSuggestion_triageId_createdAt_idx" ON "AiSuggestion"("triageId", "createdAt");
CREATE INDEX "AiSuggestion_collectionSessionId_idx" ON "AiSuggestion"("collectionSessionId");
ALTER TABLE "AiSuggestion" ADD CONSTRAINT "AiSuggestion_triageId_fkey" FOREIGN KEY ("triageId") REFERENCES "Triage"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiSuggestion" ADD CONSTRAINT "AiSuggestion_analysisRunId_fkey" FOREIGN KEY ("analysisRunId") REFERENCES "AnalysisRun"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "AiSuggestion" ADD CONSTRAINT "AiSuggestion_collectionSessionId_fkey" FOREIGN KEY ("collectionSessionId") REFERENCES "HardwareCollectionSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- The earlier migration used a default to backfill existing rows.
-- Prisma supplies @updatedAt on writes; keep the column definition aligned.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER TABLE "AiSuggestion" ALTER COLUMN "updatedAt" DROP DEFAULT;
COMMIT;

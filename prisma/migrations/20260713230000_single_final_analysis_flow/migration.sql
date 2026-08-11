DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'TriageStatus' AND e.enumlabel = 'PRELIMINARY_ANALYSIS_PENDING'
  ) THEN
    UPDATE "Triage" SET "status" = 'VITAL_SIGNS_REQUIRED' WHERE "status"::text = 'PRELIMINARY_ANALYSIS_PENDING';
    ALTER TYPE "TriageStatus" RENAME TO "TriageStatus_old";
    CREATE TYPE "TriageStatus" AS ENUM ('DRAFT', 'IDENTIFICATION_IN_PROGRESS', 'ANAMNESIS_IN_PROGRESS', 'VITAL_SIGNS_REQUIRED', 'VITAL_SIGNS_IN_PROGRESS', 'FINAL_ANALYSIS_PENDING', 'AWAITING_NURSE_REVIEW', 'RECOLLECTION_REQUESTED', 'CLASSIFIED', 'REFERRED_TO_CARE', 'CARE_WAITING', 'CALLED', 'IN_SERVICE', 'COMPLETED', 'CLOSED', 'CANCELLED');
    ALTER TABLE "Triage" ALTER COLUMN "status" DROP DEFAULT;
    ALTER TABLE "Triage" ALTER COLUMN "status" TYPE "TriageStatus" USING "status"::text::"TriageStatus";
    ALTER TABLE "Triage" ALTER COLUMN "status" SET DEFAULT 'DRAFT';
    DROP TYPE "TriageStatus_old";
  END IF;
END $migration$;

DO $migration$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_enum e JOIN pg_type t ON t.oid = e.enumtypid
    WHERE t.typname = 'AnalysisRunType' AND e.enumlabel IN ('PRELIMINARY', 'POST_VITAL_SIGNS')
  ) THEN
    ALTER TYPE "AnalysisRunType" RENAME TO "AnalysisRunType_old";
    CREATE TYPE "AnalysisRunType" AS ENUM ('FINAL');
    ALTER TABLE "AnalysisRun" ALTER COLUMN "runType" TYPE "AnalysisRunType" USING 'FINAL'::"AnalysisRunType";
    DROP TYPE "AnalysisRunType_old";
  END IF;
END $migration$;

UPDATE "RuleSetVersion"
SET "stableKey" = 'DEMO_FINAL_ANALYSIS_MIGRATED',
    "description" = 'Versão preservada e consolidada no fluxo único de análise final.'
WHERE "stableKey" = 'DEMO_PRELIMINARY_ANALYSIS';

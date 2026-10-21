-- PostgreSQL truncated the explicit name from the original migration.
-- Align metadata with Prisma's default name without rebuilding the index.
BEGIN;
SET LOCAL lock_timeout = '5s';
ALTER INDEX "DeviceCollectionSession_requestedByTriageId_status_createdAt_id"
RENAME TO "DeviceCollectionSession_requestedByTriageId_status_createdA_idx";
COMMIT;

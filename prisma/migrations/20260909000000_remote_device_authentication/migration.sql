ALTER TABLE "MedicalDevice"
  ADD COLUMN "apiTokenHash" TEXT,
  ADD COLUMN "apiTokenIssuedAt" TIMESTAMP(3),
  ADD COLUMN "apiTokenRevokedAt" TIMESTAMP(3);

ALTER TABLE "DeviceCollectionSession"
  ADD COLUMN "requestedByTriageId" TEXT;

CREATE UNIQUE INDEX "MedicalDevice_apiTokenHash_key" ON "MedicalDevice"("apiTokenHash");
CREATE INDEX "DeviceCollectionSession_requestedByTriageId_status_createdAt_idx"
  ON "DeviceCollectionSession"("requestedByTriageId", "status", "createdAt");

ALTER TABLE "DeviceCollectionSession"
  ADD CONSTRAINT "DeviceCollectionSession_requestedByTriageId_fkey"
  FOREIGN KEY ("requestedByTriageId") REFERENCES "Triage"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

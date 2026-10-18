ALTER TABLE "Reading" ADD COLUMN "externalReadingId" TEXT;
CREATE UNIQUE INDEX "Reading_externalReadingId_key" ON "Reading"("externalReadingId");
ALTER TABLE "DeviceCollectionSession" ADD COLUMN "expiresAt" TIMESTAMP(3);

CREATE TYPE "DeviceCollectionSessionStatus" AS ENUM ('WAITING', 'ACTIVE', 'CANCELLED', 'COMPLETED');

ALTER TABLE "Reading" ADD COLUMN "sessionId" TEXT;
ALTER TABLE "Reading" ALTER COLUMN "weight" DROP NOT NULL;
ALTER TABLE "Reading" ALTER COLUMN "height" DROP NOT NULL;

CREATE TABLE "DeviceCollectionSession" (
    "id" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "status" "DeviceCollectionSessionStatus" NOT NULL DEFAULT 'WAITING',
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "DeviceCollectionSession_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Reading_sessionId_receivedAt_idx" ON "Reading"("sessionId", "receivedAt");
CREATE INDEX "DeviceCollectionSession_deviceId_status_createdAt_idx" ON "DeviceCollectionSession"("deviceId", "status", "createdAt");
CREATE UNIQUE INDEX "DeviceCollectionSession_one_active_per_device" ON "DeviceCollectionSession"("deviceId") WHERE "status" = 'ACTIVE';

ALTER TABLE "Reading" ADD CONSTRAINT "Reading_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "DeviceCollectionSession"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "DeviceCollectionSession" ADD CONSTRAINT "DeviceCollectionSession_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "MedicalDevice"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

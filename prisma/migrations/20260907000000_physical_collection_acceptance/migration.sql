ALTER TABLE "HardwareCollectionSession"
  ADD COLUMN "sourceDeviceCollectionSessionId" TEXT;

CREATE UNIQUE INDEX "HardwareCollectionSession_triageId_sourceDeviceCollectionSessionId_key"
  ON "HardwareCollectionSession"("triageId", "sourceDeviceCollectionSessionId");

ALTER TABLE "HardwareCollectionSession"
  ADD CONSTRAINT "HardwareCollectionSession_sourceDeviceCollectionSessionId_fkey"
  FOREIGN KEY ("sourceDeviceCollectionSessionId") REFERENCES "DeviceCollectionSession"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

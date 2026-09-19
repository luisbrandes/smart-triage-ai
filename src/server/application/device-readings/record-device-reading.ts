import { DeviceNotFoundError, DeviceReadingSessionError } from "@/server/application/device-readings/device-reading-errors";
import type { DeviceReadingInput, DeviceReadingRepository } from "@/server/application/device-readings/device-reading-types";

export async function recordDeviceReading(repository: DeviceReadingRepository, input: DeviceReadingInput): Promise<{ readingId: string }> {
  const recorded = await repository.record(input);
  if (recorded.kind === "DEVICE_NOT_FOUND") throw new DeviceNotFoundError();
  if (recorded.kind !== "RECORDED") throw new DeviceReadingSessionError(recorded.kind);
  return { readingId: recorded.readingId };
}

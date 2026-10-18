import { describe, expect, it } from "vitest";

import { DeviceReadingSessionError } from "@/server/application/device-readings/device-reading-errors";
import { recordDeviceReading } from "@/server/application/device-readings/record-device-reading";
import type { DeviceReadingInput, DeviceReadingRecordResult, DeviceReadingRepository } from "@/server/application/device-readings/device-reading-types";

const input: DeviceReadingInput = { deviceId: "ESP32-001", sessionId: "00000000-0000-4000-8000-000000000001", readingId: "reading-1", bpm: 78, spo2: 98, temperatura: 36.7 };

class ReadingRepositorySpy implements DeviceReadingRepository {
  constructor(private readonly result: DeviceReadingRecordResult) {}
  async record(): Promise<DeviceReadingRecordResult> { return this.result; }
}

describe("registro de leitura do dispositivo", () => {
  it("cria reading válido", async () => {
    await expect(recordDeviceReading(new ReadingRepositorySpy({ kind: "RECORDED", readingId: "reading-1" }), input)).resolves.toEqual({ readingId: "reading-1" });
  });

  it("cria reading vinculada à sessão ativa", async () => {
    await expect(recordDeviceReading(new ReadingRepositorySpy({ kind: "RECORDED", readingId: "reading-2" }), { ...input, sessionId: "00000000-0000-4000-8000-000000000001" })).resolves.toEqual({ readingId: "reading-2" });
  });

  it.each(["SESSION_NOT_FOUND", "SESSION_NOT_ACTIVE", "SESSION_DEVICE_MISMATCH"] as const)("rejeita %s", async (code) => {
    await expect(recordDeviceReading(new ReadingRepositorySpy({ kind: code }), { ...input, sessionId: "00000000-0000-4000-8000-000000000001" })).rejects.toMatchObject({ code } satisfies Partial<DeviceReadingSessionError>);
  });
});

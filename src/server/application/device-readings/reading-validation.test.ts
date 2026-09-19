import { describe, expect, it } from "vitest";

import { deviceReadingSchema } from "@/server/application/device-readings/reading-validation";

const validReading = {
  deviceId: "ESP32-001",
  temperatura: 36.7,
  bpm: 78,
  spo2: 98,
};

describe("deviceReadingSchema", () => {
  it("aceita uma leitura com tipos e limites técnicos básicos", () => {
    expect(deviceReadingSchema.safeParse(validReading).success).toBe(true);
  });

  it("rejeita campos desconhecidos, tipos incorretos e valores fora dos limites", () => {
    expect(deviceReadingSchema.safeParse({ ...validReading, extra: true }).success).toBe(false);
    expect(deviceReadingSchema.safeParse({ ...validReading, bpm: "78" }).success).toBe(false);
    expect(deviceReadingSchema.safeParse({ ...validReading, spo2: 101 }).success).toBe(false);
  });
});

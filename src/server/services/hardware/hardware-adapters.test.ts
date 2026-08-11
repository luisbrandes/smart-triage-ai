import { describe, expect, it } from "vitest";

import { ManualVitalSignsAdapter } from "@/server/services/hardware/manual-vital-signs-adapter";
import { SimulatedHardwareAdapter } from "@/server/services/hardware/simulated-hardware-adapter";

describe("adaptador manual", () => {
  it("aceita coleta tecnicamente válida", async () => { const adapter = new ManualVitalSignsAdapter(); const started = await adapter.startCollection({ heartRate: 80, spo2: 98 }); expect((await adapter.getResult(started.collectionId)).status).toBe("COMPLETED"); });
  it("rejeita coleta tecnicamente inválida", async () => { const adapter = new ManualVitalSignsAdapter(); const started = await adapter.startCollection({ heartRate: 999, spo2: 140 }); expect((await adapter.getResult(started.collectionId)).status).toBe("FAILED"); });
});

describe("adaptador simulado", () => {
  it.each([["success", "COMPLETED"], ["failure", "FAILED"], ["timeout", "EXPIRED"], ["invalid", "FAILED"]] as const)("executa %s deterministicamente", async (scenario, expected) => { const adapter = new SimulatedHardwareAdapter(); const started = await adapter.startCollection({ scenario }); expect((await adapter.getResult(started.collectionId)).status).toBe(expected); });
});

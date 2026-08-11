import { randomUUID } from "node:crypto";

import { demoVitalSigns } from "@/demo/vital-signs";
import type { HardwareCollectionResult, HardwareGateway } from "@/server/services/hardware/hardware-gateway";

export type SimulationScenario = keyof typeof demoVitalSigns.scenarios;

export class SimulatedHardwareAdapter implements HardwareGateway<{ scenario: SimulationScenario }> {
  private readonly results = new Map<string, HardwareCollectionResult>();

  async startCollection({ scenario }: { scenario: SimulationScenario }): Promise<{ collectionId: string }> {
    const collectionId = randomUUID();
    const fixture = demoVitalSigns.scenarios[scenario];
    if (scenario === "success" && "heartRate" in fixture) {
      this.results.set(collectionId, { status: "COMPLETED", origin: "SIMULATED_DEVICE", readings: [
        { type: "HEART_RATE", numericValue: fixture.heartRate, unit: "bpm" },
        { type: "SPO2", numericValue: fixture.spo2, unit: "%" },
      ] });
    } else {
      this.results.set(collectionId, { status: scenario === "timeout" ? "EXPIRED" : "FAILED", origin: "SIMULATED_DEVICE", errorCode: "errorCode" in fixture ? fixture.errorCode : "DEMO_FAILURE", safeMessage: scenario === "timeout" ? "A coleta simulada expirou." : scenario === "invalid" ? "A leitura simulada foi rejeitada como inválida." : "A coleta simulada falhou." });
    }
    return { collectionId };
  }

  async getResult(collectionId: string): Promise<HardwareCollectionResult> {
    const result = this.results.get(collectionId);
    if (!result) throw new Error("Coleta simulada não encontrada.");
    return result;
  }

  async cancelCollection(collectionId: string): Promise<void> { this.results.delete(collectionId); }
}

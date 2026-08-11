import { randomUUID } from "node:crypto";

import { demoVitalSigns } from "@/demo/vital-signs";
import type { HardwareCollectionResult, HardwareGateway } from "@/server/services/hardware/hardware-gateway";

type ManualRequest = { heartRate: number; spo2: number };

export class ManualVitalSignsAdapter implements HardwareGateway<ManualRequest> {
  private readonly results = new Map<string, HardwareCollectionResult>();

  async startCollection(request: ManualRequest): Promise<{ collectionId: string }> {
    const collectionId = randomUUID();
    const heartRateValid = request.heartRate >= demoVitalSigns.technicalRanges.heartRate.minimum && request.heartRate <= demoVitalSigns.technicalRanges.heartRate.maximum;
    const spo2Valid = request.spo2 >= demoVitalSigns.technicalRanges.spo2.minimum && request.spo2 <= demoVitalSigns.technicalRanges.spo2.maximum;
    this.results.set(collectionId, heartRateValid && spo2Valid ? {
      status: "COMPLETED",
      origin: "MANUAL",
      readings: [
        { type: "HEART_RATE", numericValue: request.heartRate, unit: demoVitalSigns.technicalRanges.heartRate.unit },
        { type: "SPO2", numericValue: request.spo2, unit: demoVitalSigns.technicalRanges.spo2.unit },
      ],
    } : { status: "FAILED", origin: "MANUAL", errorCode: "DEMO_TECHNICAL_RANGE", safeMessage: "Valores fora das faixas técnicas demonstrativas." });
    return { collectionId };
  }

  async getResult(collectionId: string): Promise<HardwareCollectionResult> {
    const result = this.results.get(collectionId);
    if (!result) throw new Error("Coleta manual não encontrada.");
    return result;
  }

  async cancelCollection(collectionId: string): Promise<void> { this.results.delete(collectionId); }
}

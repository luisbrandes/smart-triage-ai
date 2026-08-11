export type VitalSignsOrigin = "MANUAL" | "SIMULATED_DEVICE";
export type VitalSignsReading = { type: "HEART_RATE" | "SPO2"; numericValue: number; unit: string };
export type HardwareCollectionResult =
  | { status: "COMPLETED"; origin: VitalSignsOrigin; readings: VitalSignsReading[] }
  | { status: "FAILED" | "EXPIRED"; origin: VitalSignsOrigin; errorCode: string; safeMessage: string };

export interface HardwareGateway<Request> {
  startCollection(request: Request): Promise<{ collectionId: string }>;
  getResult(collectionId: string): Promise<HardwareCollectionResult>;
  cancelCollection(collectionId: string): Promise<void>;
}

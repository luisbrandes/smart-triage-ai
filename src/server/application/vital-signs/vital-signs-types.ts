import type { HardwareCollectionResult, VitalSignsOrigin } from "@/server/services/hardware/hardware-gateway";

export type CollectionAttemptView = {
  id: string;
  attemptNumber: number;
  origin: VitalSignsOrigin;
  status: "COMPLETED" | "FAILED" | "EXPIRED";
  readings: { type: "HEART_RATE" | "SPO2"; numericValue: number; unit: string }[];
  safeError?: string;
};

export type VitalSignsFlowView = { triageStatus: string; attempts: CollectionAttemptView[]; canConfirm: boolean };

export type RecordAttemptInput = { triageId: string; result: HardwareCollectionResult };

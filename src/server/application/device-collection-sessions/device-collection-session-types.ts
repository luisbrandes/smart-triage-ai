export type DeviceCollectionSessionStatus = "WAITING" | "ACTIVE" | "CANCELLED" | "COMPLETED";

export type DeviceCollectionSessionView = { sessionId: string; deviceId: string; status: DeviceCollectionSessionStatus; expiresAt?: Date | null };

export type DeviceCollectionReadingView = {
  readingId: string;
  bpm: number;
  spo2: number;
  temperatura: number;
  receivedAt: Date;
};

export type DeviceCollectionSessionDetailView = DeviceCollectionSessionView & {
  startedAt: Date | null;
  completedAt: Date | null;
  cancelledAt: Date | null;
  readings: DeviceCollectionReadingView[];
};

export type StartSessionResult = DeviceCollectionSessionView | { kind: "DEVICE_NOT_FOUND" } | { kind: "ACTIVE_SESSION_EXISTS" };
export type CancelSessionResult = DeviceCollectionSessionView | { kind: "SESSION_NOT_FOUND" } | { kind: "SESSION_OWNER_MISMATCH" };

export interface DeviceCollectionSessionRepository {
  start(deviceId: string, triageId: string): Promise<StartSessionResult>;
  cancel(sessionId: string, triageId: string): Promise<CancelSessionResult>;
  release(deviceId: string, sessionId?: string): Promise<DeviceCollectionSessionView | { kind: "DEVICE_NOT_FOUND" }>;
  findById(sessionId: string, triageId: string): Promise<DeviceCollectionSessionDetailView | null>;
  findActiveForDevice(deviceInternalId: string): Promise<DeviceCollectionSessionView | null>;
}

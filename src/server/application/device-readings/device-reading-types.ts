export type DeviceReadingInput = {
  deviceId: string;
  sessionId: string;
  readingId: string;
  temperatura: number;
  bpm: number;
  spo2: number;
};

export type DeviceReadingRecordResult =
  | { kind: "RECORDED"; readingId: string }
  | { kind: "DEVICE_NOT_FOUND" }
  | { kind: "SESSION_NOT_FOUND" }
  | { kind: "SESSION_DEVICE_MISMATCH" }
  | { kind: "SESSION_NOT_ACTIVE" }
  | { kind: "READING_DEVICE_MISMATCH" };

export interface DeviceReadingRepository {
  record(input: DeviceReadingInput): Promise<DeviceReadingRecordResult>;
}

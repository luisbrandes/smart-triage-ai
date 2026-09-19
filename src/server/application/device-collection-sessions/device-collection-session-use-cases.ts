import { DeviceCollectionSessionError } from "@/server/application/device-collection-sessions/device-collection-session-errors";
import type { DeviceCollectionSessionDetailView, DeviceCollectionSessionRepository, DeviceCollectionSessionView } from "@/server/application/device-collection-sessions/device-collection-session-types";

export async function startDeviceCollectionSession(repository: DeviceCollectionSessionRepository, deviceId: string): Promise<DeviceCollectionSessionView> {
  const result = await repository.start(deviceId);
  if ("kind" in result) throw new DeviceCollectionSessionError(result.kind);
  return result;
}

export async function cancelDeviceCollectionSession(repository: DeviceCollectionSessionRepository, sessionId: string): Promise<DeviceCollectionSessionView> {
  const result = await repository.cancel(sessionId);
  if ("kind" in result) throw new DeviceCollectionSessionError(result.kind);
  return result;
}

export async function releaseDeviceCollectionSession(repository: DeviceCollectionSessionRepository, deviceId: string): Promise<DeviceCollectionSessionView> {
  const result = await repository.release(deviceId);
  if ("kind" in result) throw new DeviceCollectionSessionError(result.kind);
  return result;
}

export async function getDeviceCollectionSession(repository: DeviceCollectionSessionRepository, sessionId: string): Promise<DeviceCollectionSessionDetailView> {
  const session = await repository.findById(sessionId);
  if (!session) throw new DeviceCollectionSessionError("SESSION_NOT_FOUND");
  return session;
}

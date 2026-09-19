export class DeviceCollectionSessionError extends Error {
  constructor(readonly code: "DEVICE_NOT_FOUND" | "ACTIVE_SESSION_EXISTS" | "SESSION_NOT_FOUND") {
    super("Não foi possível alterar a sessão de coleta.");
  }
}

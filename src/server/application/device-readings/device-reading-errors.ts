export class DeviceNotFoundError extends Error {
  constructor() {
    super("Dispositivo não encontrado.");
  }
}

export class DeviceReadingSessionError extends Error {
  constructor(readonly code: "SESSION_NOT_FOUND" | "SESSION_DEVICE_MISMATCH" | "SESSION_NOT_ACTIVE" | "READING_DEVICE_MISMATCH") {
    super("Sessão de coleta inválida para esta leitura.");
  }
}

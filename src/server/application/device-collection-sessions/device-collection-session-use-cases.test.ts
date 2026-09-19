import { describe, expect, it } from "vitest";

import { DeviceCollectionSessionError } from "@/server/application/device-collection-sessions/device-collection-session-errors";
import { cancelDeviceCollectionSession, getDeviceCollectionSession, releaseDeviceCollectionSession, startDeviceCollectionSession } from "@/server/application/device-collection-sessions/device-collection-session-use-cases";
import type { CancelSessionResult, DeviceCollectionSessionRepository, DeviceCollectionSessionView, StartSessionResult } from "@/server/application/device-collection-sessions/device-collection-session-types";

class SessionRepositorySpy implements DeviceCollectionSessionRepository {
  active = false;
  sessions = new Map<string, DeviceCollectionSessionView>();
  private sequence = 0;

  async start(deviceId: string, _triageId: string): Promise<StartSessionResult> {
    void _triageId;
    if (deviceId === "UNKNOWN") return { kind: "DEVICE_NOT_FOUND" };
    if (this.active) return { kind: "ACTIVE_SESSION_EXISTS" };
    const session = { sessionId: `session-${++this.sequence}`, deviceId, status: "ACTIVE" as const };
    this.sessions.set(session.sessionId, session);
    this.active = true;
    return session;
  }

  async cancel(sessionId: string, _triageId: string): Promise<CancelSessionResult> {
    void _triageId;
    const session = this.sessions.get(sessionId);
    if (!session) return { kind: "SESSION_NOT_FOUND" };
    const cancelled = { ...session, status: "CANCELLED" as const };
    this.sessions.set(sessionId, cancelled);
    this.active = false;
    return cancelled;
  }

  async release(deviceId: string): Promise<DeviceCollectionSessionView | { kind: "DEVICE_NOT_FOUND" }> {
    if (deviceId === "UNKNOWN") return { kind: "DEVICE_NOT_FOUND" };
    this.active = false;
    return { sessionId: `session-${++this.sequence}`, deviceId, status: "WAITING" };
  }

  async findById(sessionId: string, _triageId: string) {
    void _triageId;
    const session = this.sessions.get(sessionId);
    return session ? { ...session, startedAt: new Date("2026-01-01T10:00:00.000Z"), completedAt: null, cancelledAt: null, readings: [{ readingId: "reading-1", bpm: 78, spo2: 98, temperatura: 36.7, receivedAt: new Date("2026-01-01T10:01:00.000Z") }] } : null;
  }
  async findActiveForDevice() { return null; }
}

describe("sessões de coleta por dispositivo", () => {
  it("inicia uma sessão ativa", async () => {
    const repository = new SessionRepositorySpy();
    await expect(startDeviceCollectionSession(repository, "ESP32-001", "triage-1")).resolves.toMatchObject({ status: "ACTIVE" });
  });

  it("impede duas sessões ativas no mesmo dispositivo", async () => {
    const repository = new SessionRepositorySpy();
    await startDeviceCollectionSession(repository, "ESP32-001", "triage-1");
    await expect(startDeviceCollectionSession(repository, "ESP32-001", "triage-1")).rejects.toMatchObject({ code: "ACTIVE_SESSION_EXISTS" } satisfies Partial<DeviceCollectionSessionError>);
  });

  it("cancela uma sessão existente", async () => {
    const repository = new SessionRepositorySpy();
    const session = await startDeviceCollectionSession(repository, "ESP32-001", "triage-1");
    await expect(cancelDeviceCollectionSession(repository, session.sessionId, "triage-1")).resolves.toMatchObject({ status: "CANCELLED" });
  });

  it("libera o dispositivo para uma nova coleta", async () => {
    const repository = new SessionRepositorySpy();
    await startDeviceCollectionSession(repository, "ESP32-001", "triage-1");
    await expect(releaseDeviceCollectionSession(repository, "ESP32-001")).resolves.toMatchObject({ status: "WAITING" });
  });

  it("consulta a sessão com as leituras recebidas", async () => {
    const repository = new SessionRepositorySpy();
    const session = await startDeviceCollectionSession(repository, "ESP32-001", "triage-1");
    await expect(getDeviceCollectionSession(repository, session.sessionId, "triage-1")).resolves.toMatchObject({ status: "ACTIVE", readings: [{ bpm: 78, spo2: 98, temperatura: 36.7 }] });
  });

  it("rejeita a consulta de sessão inexistente", async () => {
    const repository = new SessionRepositorySpy();
    await expect(getDeviceCollectionSession(repository, "unknown", "triage-1")).rejects.toMatchObject({ code: "SESSION_NOT_FOUND" } satisfies Partial<DeviceCollectionSessionError>);
  });
});

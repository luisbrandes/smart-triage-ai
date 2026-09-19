import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";
import type { CancelSessionResult, DeviceCollectionSessionDetailView, DeviceCollectionSessionRepository, DeviceCollectionSessionView, StartSessionResult } from "@/server/application/device-collection-sessions/device-collection-session-types";

function toView(session: { id: string; deviceId: string; status: string }): DeviceCollectionSessionView {
  return { sessionId: session.id, deviceId: session.deviceId, status: session.status as DeviceCollectionSessionView["status"] };
}

export class PrismaDeviceCollectionSessionRepository implements DeviceCollectionSessionRepository {
  async findById(sessionId: string, triageId: string): Promise<DeviceCollectionSessionDetailView | null> {
    const session = await prisma.deviceCollectionSession.findUnique({
      where: { id: sessionId, requestedByTriageId: triageId },
      include: {
        device: { select: { externalIdentifier: true } },
        readings: { orderBy: { receivedAt: "asc" }, select: { id: true, heartRate: true, spo2: true, temperature: true, receivedAt: true } },
      },
    });
    if (!session || !session.device.externalIdentifier) return null;
    return {
      ...toView(session),
      deviceId: session.device.externalIdentifier,
      startedAt: session.startedAt,
      completedAt: session.completedAt,
      cancelledAt: session.cancelledAt,
      readings: session.readings.map((reading) => ({
        readingId: reading.id,
        bpm: reading.heartRate,
        spo2: reading.spo2,
        temperatura: reading.temperature,
        receivedAt: reading.receivedAt,
      })),
    };
  }

  async start(deviceId: string, triageId: string): Promise<StartSessionResult> {
    try {
      return await prisma.$transaction(async (transaction) => {
        const device = await transaction.medicalDevice.findFirst({ where: { externalIdentifier: deviceId, isActive: true }, select: { id: true } });
        if (!device) return { kind: "DEVICE_NOT_FOUND" };
        const active = await transaction.deviceCollectionSession.findFirst({ where: { deviceId: device.id, status: "ACTIVE" }, select: { id: true } });
        if (active) return { kind: "ACTIVE_SESSION_EXISTS" };
        const waiting = await transaction.deviceCollectionSession.findFirst({ where: { deviceId: device.id, status: "WAITING" }, orderBy: { createdAt: "desc" } });
        const session = waiting
          ? await transaction.deviceCollectionSession.update({ where: { id: waiting.id }, data: { status: "ACTIVE", startedAt: new Date(), requestedByTriageId: triageId } })
          : await transaction.deviceCollectionSession.create({ data: { deviceId: device.id, requestedByTriageId: triageId, status: "ACTIVE", startedAt: new Date() } });
        await transaction.auditEvent.create({ data: { entityType: "DeviceCollectionSession", entityId: session.id, action: "DEVICE_COLLECTION_STARTED", actorType: "SYSTEM", actorReference: device.id, sanitizedMetadata: { source: "HTTP_DEVICE_SESSION" } } });
        return toView(session);
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") return { kind: "ACTIVE_SESSION_EXISTS" };
      throw error;
    }
  }

  async cancel(sessionId: string, triageId: string): Promise<CancelSessionResult> {
    return prisma.$transaction(async (transaction) => {
      const session = await transaction.deviceCollectionSession.findUnique({ where: { id: sessionId } });
      if (!session) return { kind: "SESSION_NOT_FOUND" };
      if (session.requestedByTriageId !== triageId) return { kind: "SESSION_OWNER_MISMATCH" };
      if (session.status === "CANCELLED" || session.status === "COMPLETED") return toView(session);
      const cancelled = await transaction.deviceCollectionSession.update({ where: { id: session.id }, data: { status: "CANCELLED", cancelledAt: new Date() } });
      await transaction.auditEvent.create({ data: { entityType: "DeviceCollectionSession", entityId: cancelled.id, action: "DEVICE_COLLECTION_CANCELLED", actorType: "SYSTEM", actorReference: cancelled.deviceId, sanitizedMetadata: { source: "HTTP_DEVICE_SESSION" } } });
      return toView(cancelled);
    });
  }

  async release(deviceId: string): Promise<DeviceCollectionSessionView | { kind: "DEVICE_NOT_FOUND" }> {
    return prisma.$transaction(async (transaction) => {
      const device = await transaction.medicalDevice.findFirst({ where: { externalIdentifier: deviceId, isActive: true }, select: { id: true } });
      if (!device) return { kind: "DEVICE_NOT_FOUND" };
      const active = await transaction.deviceCollectionSession.findFirst({ where: { deviceId: device.id, status: "ACTIVE" } });
      if (active) {
        await transaction.deviceCollectionSession.update({ where: { id: active.id }, data: { status: "COMPLETED", completedAt: new Date() } });
      }
      const waiting = await transaction.deviceCollectionSession.create({ data: { deviceId: device.id, status: "WAITING" } });
      await transaction.auditEvent.create({ data: { entityType: "DeviceCollectionSession", entityId: waiting.id, action: "DEVICE_COLLECTION_RELEASED", actorType: "SYSTEM", actorReference: device.id, sanitizedMetadata: { source: "HTTP_DEVICE_SESSION" } } });
      return toView(waiting);
    });
  }

  async findActiveForDevice(deviceInternalId: string): Promise<DeviceCollectionSessionView | null> {
    const session = await prisma.deviceCollectionSession.findFirst({
      where: { deviceId: deviceInternalId, status: "ACTIVE" },
      orderBy: { createdAt: "desc" },
    });
    return session ? toView(session) : null;
  }
}

import "server-only";

import { prisma } from "@/server/db/prisma";
import type { DeviceReadingInput, DeviceReadingRecordResult, DeviceReadingRepository } from "@/server/application/device-readings/device-reading-types";

export class PrismaDeviceReadingRepository implements DeviceReadingRepository {
  async record(input: DeviceReadingInput): Promise<DeviceReadingRecordResult> {
    return prisma.$transaction(async (transaction) => {
      const device = await transaction.medicalDevice.findFirst({
        where: { externalIdentifier: input.deviceId, isActive: true },
        select: { id: true },
      });

      if (!device) return { kind: "DEVICE_NOT_FOUND" };

      if (input.sessionId) {
        const session = await transaction.deviceCollectionSession.findUnique({
          where: { id: input.sessionId },
          select: { deviceId: true, status: true },
        });
        if (!session) return { kind: "SESSION_NOT_FOUND" };
        if (session.deviceId !== device.id) return { kind: "SESSION_DEVICE_MISMATCH" };
        if (session.status !== "ACTIVE") return { kind: "SESSION_NOT_ACTIVE" };
      }

      const reading = await transaction.reading.create({
        data: {
          deviceId: device.id,
          sessionId: input.sessionId,
          temperature: input.temperatura,
          heartRate: input.bpm,
          spo2: input.spo2,
        },
        select: { id: true },
      });

      await transaction.medicalDevice.update({
        where: { id: device.id },
        data: { lastCommunicationAt: new Date() },
      });

      await transaction.auditEvent.create({
        data: {
          entityType: "Reading",
          entityId: reading.id,
          action: "DEVICE_READING_RECORDED",
          actorType: "SYSTEM",
          actorReference: device.id,
          sanitizedMetadata: { source: "HTTP_DEVICE_INGESTION" },
        },
      });

      return { kind: "RECORDED", readingId: reading.id };
    });
  }
}

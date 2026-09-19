import "server-only";

import { prisma } from "@/server/db/prisma";

export type AuthenticatedDevice = { internalId: string; deviceId: string };

export class PrismaDeviceAuthenticationRepository {
  async findActiveByTokenHash(tokenHash: string): Promise<AuthenticatedDevice | null> {
    const device = await prisma.medicalDevice.findFirst({
      where: { apiTokenHash: tokenHash, apiTokenRevokedAt: null, isActive: true },
      select: { id: true, externalIdentifier: true },
    });
    return device?.externalIdentifier ? { internalId: device.id, deviceId: device.externalIdentifier } : null;
  }
}

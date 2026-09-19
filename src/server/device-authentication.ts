import "server-only";

import { PrismaDeviceAuthenticationRepository, type AuthenticatedDevice } from "@/server/repositories/prisma-device-authentication-repository";
import { hashDeviceToken, readBearerToken } from "@/server/security/device-token";

const repository = new PrismaDeviceAuthenticationRepository();

export async function authenticateDeviceRequest(request: Request): Promise<AuthenticatedDevice | null> {
  const token = readBearerToken(request);
  if (!token) return null;
  try { return await repository.findActiveByTokenHash(hashDeviceToken(token)); } catch { return null; }
}

import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "../src/generated/prisma/client";
import { generateDeviceToken, hashDeviceToken } from "../src/server/security/device-token";

const deviceId = process.argv[2]?.trim();
if (!deviceId || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/.test(deviceId)) {
  throw new Error("Uso: pnpm device:provision -- <deviceId>");
}

const databaseUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("Configure DIRECT_DATABASE_URL ou DATABASE_URL.");

const prisma = databaseUrl.startsWith("prisma+postgres://")
  ? new PrismaClient({ accelerateUrl: databaseUrl })
  : new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

async function main() {
  const token = generateDeviceToken();
  await prisma.medicalDevice.upsert({
    where: { externalIdentifier: deviceId },
    update: { apiTokenHash: hashDeviceToken(token), apiTokenIssuedAt: new Date(), apiTokenRevokedAt: null, isActive: true },
    create: {
      externalIdentifier: deviceId,
      displayName: `Dispositivo de homologação ${deviceId}`,
      model: "REMOTE-HTTP-TEST",
      operationalStatus: "AVAILABLE",
      isActive: true,
      apiTokenHash: hashDeviceToken(token),
      apiTokenIssuedAt: new Date(),
    },
  });
  console.info(`DEVICE_ID=${deviceId}`);
  console.info(`DEVICE_TOKEN=${token}`);
  console.info("Guarde o token agora: ele não poderá ser recuperado do banco.");
}

main().finally(async () => { await prisma.$disconnect(); });

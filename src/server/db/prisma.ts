import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";

import { PrismaClient } from "@/generated/prisma/client";
import { logServerOperation } from "@/server/observability/server-logger";
import { resolveConnectionTimeoutMillis } from "@/server/db/connection-timeout";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL não está definida para o ambiente do servidor.");
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function logConnectionFailure(error: Error, state: "POOL" | "CONNECTION"): void {
  const code = "code" in error && typeof error.code === "string" ? error.code : "";
  const allowedCodes = ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EPIPE", "57P01", "57P02", "57P03"];
  logServerOperation({
    operation: "database-connection",
    correlationId: crypto.randomUUID(),
    actorType: "SYSTEM",
    entity: "DatabasePool",
    result: "FAILURE",
    state,
    errorCode: allowedCodes.includes(code) ? code : "DATABASE_CONNECTION_FAILURE",
  });
}

function optionalServerTimeout(name: "DATABASE_STATEMENT_TIMEOUT_MS" | "DATABASE_LOCK_TIMEOUT_MS"): number | undefined {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return undefined;
  const value = Number(raw);
  if (!Number.isSafeInteger(value) || value < 1 || value > 120_000) {
    throw new Error(`${name} deve ser um inteiro entre 1 e 120000.`);
  }
  return value;
}

function createPrismaClient(connectionString: string) {
  if (connectionString.startsWith("prisma+postgres://")) {
    return new PrismaClient({ accelerateUrl: connectionString });
  }
  const adapter = new PrismaPg({
    connectionString,
    max: 2,
    connectionTimeoutMillis: resolveConnectionTimeoutMillis(connectionString, process.env.DATABASE_CONNECTION_TIMEOUT_MS),
    idleTimeoutMillis: 30_000,
    keepAlive: true,
    // Opt in only when the database/provider supports these startup parameters.
    statement_timeout: optionalServerTimeout("DATABASE_STATEMENT_TIMEOUT_MS"),
    lock_timeout: optionalServerTimeout("DATABASE_LOCK_TIMEOUT_MS"),
  }, {
    onPoolError: (error) => logConnectionFailure(error, "POOL"),
    onConnectionError: (error) => logConnectionFailure(error, "CONNECTION"),
  });
  return new PrismaClient({ adapter });
}

// Each Node.js/Vercel instance owns its client and pool. Never disconnect per request.
export const prisma = globalForPrisma.prisma ??= createPrismaClient(databaseUrl);

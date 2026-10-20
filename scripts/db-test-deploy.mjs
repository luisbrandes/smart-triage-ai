import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import dotenv from "dotenv";

const prismaPostgresHosts = new Set(["pooled.db.prisma.io", "db.prisma.io"]);

function parsePostgresUrl(value, label) {
  let target;
  try {
    target = new URL(value);
  } catch {
    throw new Error(`${label} is invalid; its destination cannot be verified.`);
  }
  if (target.protocol !== "postgres:" && target.protocol !== "postgresql:") {
    throw new Error(`${label} must point directly to PostgreSQL.`);
  }
  return target;
}

function sameDatabase(left, right) {
  if (prismaPostgresHosts.has(left.hostname) && prismaPostgresHosts.has(right.hostname)) {
    return left.username === right.username
      && (left.port || "5432") === (right.port || "5432")
      && left.pathname === right.pathname;
  }
  return left.hostname === right.hostname
    && (left.port || "5432") === (right.port || "5432")
    && left.pathname === right.pathname;
}

export function getTestDatabaseUrl({ testDatabaseUrl, databaseUrl, directDatabaseUrl }) {
  if (typeof testDatabaseUrl !== "string" || testDatabaseUrl.length === 0) {
    throw new Error("TEST_DATABASE_URL is required for test migrations.");
  }
  const testTarget = parsePostgresUrl(testDatabaseUrl, "TEST_DATABASE_URL");
  if (typeof databaseUrl !== "string" || databaseUrl.length === 0) {
    throw new Error("DATABASE_URL is required to verify test database isolation.");
  }
  if (typeof directDatabaseUrl !== "string" || directDatabaseUrl.length === 0) {
    throw new Error("DIRECT_DATABASE_URL is required to verify test database isolation.");
  }

  const runtimeTarget = parsePostgresUrl(databaseUrl, "DATABASE_URL");
  const directTarget = parsePostgresUrl(directDatabaseUrl, "DIRECT_DATABASE_URL");
  if (sameDatabase(testTarget, runtimeTarget)) {
    throw new Error("TEST_DATABASE_URL cannot point to the application's runtime database.");
  }
  if (sameDatabase(testTarget, directTarget)) {
    throw new Error("TEST_DATABASE_URL cannot point to the application's migration database.");
  }
  const databaseName = decodeURIComponent(testTarget.pathname.slice(1));
  const isPrismaTestDatabase = prismaPostgresHosts.has(testTarget.hostname)
    && prismaPostgresHosts.has(runtimeTarget.hostname)
    && prismaPostgresHosts.has(directTarget.hostname)
    && testTarget.username !== runtimeTarget.username
    && testTarget.username !== directTarget.username;
  if (!/test/i.test(databaseName) && !isPrismaTestDatabase) {
    throw new Error("TEST_DATABASE_URL must identify a dedicated test database.");
  }
  return testDatabaseUrl;
}

export function getDirectTestDatabaseUrl(testDatabaseUrl) {
  const target = parsePostgresUrl(testDatabaseUrl, "TEST_DATABASE_URL");
  if (target.hostname === "pooled.db.prisma.io") target.hostname = "db.prisma.io";
  return target.toString();
}

async function main() {
  dotenv.config({ quiet: true });

  let testDatabaseUrl;
  try {
    testDatabaseUrl = getTestDatabaseUrl({
      testDatabaseUrl: process.env.TEST_DATABASE_URL,
      databaseUrl: process.env.DATABASE_URL,
      directDatabaseUrl: process.env.DIRECT_DATABASE_URL,
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Invalid test database configuration.");
    process.exitCode = 1;
    return;
  }

  const prismaCli = fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url));
  const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    env: { ...process.env, DIRECT_DATABASE_URL: getDirectTestDatabaseUrl(testDatabaseUrl) },
    stdio: "inherit",
  });

  if (result.error) {
    console.error("Could not start Prisma to apply test database migrations.");
    process.exitCode = 1;
    return;
  }
  process.exitCode = result.status ?? 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}

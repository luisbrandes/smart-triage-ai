import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

import dotenv from "dotenv";

export function getTestDatabaseUrl({ testDatabaseUrl, databaseUrl }) {
  if (typeof testDatabaseUrl !== "string" || testDatabaseUrl.length === 0) {
    throw new Error("TEST_DATABASE_URL é obrigatória para aplicar migrations no banco de teste.");
  }

  let testTarget;
  try {
    testTarget = new URL(testDatabaseUrl);
  } catch {
    throw new Error("TEST_DATABASE_URL não é uma URL PostgreSQL válida.");
  }

  if (testTarget.protocol !== "postgres:" && testTarget.protocol !== "postgresql:") {
    throw new Error("TEST_DATABASE_URL deve apontar diretamente para PostgreSQL.");
  }

  const databaseName = decodeURIComponent(testTarget.pathname.slice(1));
  if (!/test/i.test(databaseName)) {
    throw new Error("O nome do banco definido em TEST_DATABASE_URL deve identificá-lo como banco de teste.");
  }

  if (typeof databaseUrl !== "string" || databaseUrl.length === 0) {
    throw new Error("DATABASE_URL é obrigatória para confirmar que o banco de teste é separado.");
  }

  let runtimeTarget;
  try {
    runtimeTarget = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL inválida; não foi possível confirmar que o destino de teste é separado.");
  }

  if (runtimeTarget.protocol !== "postgres:" && runtimeTarget.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL deve apontar diretamente para PostgreSQL para verificar a separação do banco de teste.");
  }

  const runtimeName = decodeURIComponent(runtimeTarget.pathname.slice(1));
  const runtimePort = runtimeTarget.port || "5432";
  const testPort = testTarget.port || "5432";

  if (runtimeTarget.hostname === testTarget.hostname && runtimePort === testPort && runtimeName === databaseName) {
    throw new Error("TEST_DATABASE_URL não pode apontar ao mesmo banco usado pela aplicação.");
  }

  return testDatabaseUrl;
}

async function main() {
  dotenv.config({ quiet: true });

  let testDatabaseUrl;
  try {
    testDatabaseUrl = getTestDatabaseUrl({
      testDatabaseUrl: process.env.TEST_DATABASE_URL,
      databaseUrl: process.env.DATABASE_URL,
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Configuração do banco de teste inválida.");
    process.exitCode = 1;
    return;
  }

  const prismaCli = fileURLToPath(new URL("../node_modules/prisma/build/index.js", import.meta.url));
  const result = spawnSync(process.execPath, [prismaCli, "migrate", "deploy"], {
    env: { ...process.env, DIRECT_DATABASE_URL: testDatabaseUrl },
    stdio: "inherit",
  });

  if (result.error) {
    console.error("Não foi possível iniciar o Prisma para aplicar migrations no banco de teste.");
    process.exitCode = 1;
    return;
  }

  process.exitCode = result.status ?? 1;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}

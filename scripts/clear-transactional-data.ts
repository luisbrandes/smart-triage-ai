import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";

import { Prisma, PrismaClient } from "../src/generated/prisma/client";

const CONFIRMATION_FLAG = "--confirm";

const STRUCTURAL_TABLES = [
  "_prisma_migrations",
  "RuleSetVersion",
  "MedicalDevice",
  "DeviceCapability",
] as const;

const TRANSACTIONAL_TABLES = [
  "AuditEvent",
  "CareAttendance",
  "CareReferral",
  "NurseReview",
  "RecommendationReason",
  "AnalysisRecommendation",
  "AnalysisRun",
  "VitalSignMeasurement",
  "HardwareError",
  "HardwareCollectionSession",
  "QueueTicket",
  "RedFlagOccurrence",
  "AnamnesisAnswer",
  "Anamnesis",
  "ConsentRecord",
  "HealthPlanInformation",
  "Triage",
  "Patient",
] as const;

type TableCounts = Record<string, number>;

function quoteIdentifier(identifier: string) {
  return `"${identifier.replaceAll('"', '""')}"`;
}

function normalizeAdministrativeUrl(connectionString: string) {
  const url = new URL(connectionString);
  const sslMode = url.searchParams.get("sslmode");

  if (["prefer", "require", "verify-ca"].includes(sslMode ?? "")) {
    url.searchParams.set("sslmode", "verify-full");
  }

  return url.toString();
}

async function countTables(
  client: Prisma.TransactionClient,
  tables: readonly string[],
) {
  const counts: TableCounts = {};

  for (const table of tables) {
    const result = await client.$queryRawUnsafe<Array<{ count: bigint }>>(
      `SELECT COUNT(*)::text AS count FROM ${quoteIdentifier(table)}`,
    );
    counts[table] = Number(result[0]?.count ?? 0);
  }

  return counts;
}

async function main() {
  if (!process.argv.includes(CONFIRMATION_FLAG)) {
    throw new Error(
      `Confirmação ausente. Execute novamente com ${CONFIRMATION_FLAG} para apagar os dados transacionais.`,
    );
  }

  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL não está definida.");
  }

  const directDatabaseUrl = process.env.DIRECT_DATABASE_URL;
  const maintenanceUrl = directDatabaseUrl ??
    (databaseUrl.startsWith("prisma+postgres://") ? undefined : databaseUrl);

  if (!maintenanceUrl) {
    throw new Error(
      "DIRECT_DATABASE_URL não está definida. Gere uma conexão direta administrativa no provedor do banco; a URL do Prisma Accelerate não possui permissão para esta manutenção.",
    );
  }

  const client = new PrismaClient({
    adapter: new PrismaPg(normalizeAdministrativeUrl(maintenanceUrl)),
  });

  try {
    const result = await client.$transaction(
      async (transaction) => {
        const structuralBefore = await countTables(
          transaction,
          STRUCTURAL_TABLES,
        );
        const transactionalBefore = await countTables(
          transaction,
          TRANSACTIONAL_TABLES,
        );

        await transaction.$executeRawUnsafe(
          'ALTER TABLE "AuditEvent" DISABLE TRIGGER "AuditEvent_append_only"',
        );

        for (const table of TRANSACTIONAL_TABLES) {
          await transaction.$executeRawUnsafe(
            `DELETE FROM ${quoteIdentifier(table)}`,
          );
        }

        await transaction.$executeRawUnsafe(
          'ALTER TABLE "AuditEvent" ENABLE TRIGGER "AuditEvent_append_only"',
        );

        const structuralAfter = await countTables(
          transaction,
          STRUCTURAL_TABLES,
        );
        const transactionalAfter = await countTables(
          transaction,
          TRANSACTIONAL_TABLES,
        );

        for (const table of STRUCTURAL_TABLES) {
          if (structuralAfter[table] !== structuralBefore[table]) {
            throw new Error(`A tabela estrutural ${table} foi alterada.`);
          }
        }

        for (const table of TRANSACTIONAL_TABLES) {
          if (transactionalAfter[table] !== 0) {
            throw new Error(`A tabela transacional ${table} não ficou vazia.`);
          }
        }

        return { structuralAfter, transactionalBefore };
      },
      { maxWait: 10_000, timeout: 60_000 },
    );

    console.log("Limpeza transacional concluída.");
    console.table(result.transactionalBefore);
    console.log("Tabelas estruturais preservadas:");
    console.table(result.structuralAfter);
  } finally {
    await client.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error("Falha ao limpar dados transacionais:");
  console.error(error);
  process.exitCode = 1;
});

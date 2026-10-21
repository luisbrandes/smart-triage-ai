import "dotenv/config";
import { mkdirSync, writeFileSync } from "node:fs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { rateLimitQuery } from "../src/server/db/rate-limit-query";

async function main() {
  const { getTestDatabaseUrl } = await import("./db-test-deploy.mjs");
  // EXPLAIN ANALYZE executes mutations: never accept a remote or application DB.
  const url = getTestDatabaseUrl({ testDatabaseUrl: process.env.TEST_DATABASE_URL, databaseUrl: process.env.DATABASE_URL, directDatabaseUrl: process.env.DIRECT_DATABASE_URL });
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(url).hostname)) throw new Error("EXPLAIN requires an isolated loopback TEST_DATABASE_URL.");
  const client = new PrismaClient({ adapter: new PrismaPg({ connectionString: url, max: 1, connectionTimeoutMillis: 5000 }) });
  const rollback = new Error("ROLLBACK_BENCHMARK");
  const report: Record<string, unknown> = { syntheticRows: 100_000, environment: "isolated-local-postgresql", rolledBack: false, scenarios: {} };

  try {
    await client.$transaction(async (tx) => {
      const prefix = `benchmark-${crypto.randomUUID()}-`;
      const now = new Date();
      await tx.$executeRawUnsafe(`INSERT INTO "RateLimitBucket" ("key", "windowStartedAt", "count", "updatedAt")
        SELECT $1 || g::text, CURRENT_TIMESTAMP, 1,
        CASE WHEN g <= 1000 THEN CURRENT_TIMESTAMP - interval '72 hours' ELSE CURRENT_TIMESTAMP END
        FROM generate_series(1, 100000) g`, prefix);
      await tx.$executeRawUnsafe('ANALYZE "RateLimitBucket"');
      const key = `${prefix}active`;
      const query = rateLimitQuery(key, now, new Date(now.getTime() - 60_000), 2);
      const scenarios = report.scenarios as Record<string, unknown>;
      for (const label of ["newBucket", "acceptedConflict", "exhaustedConflict"]) {
        const result = await tx.$queryRawUnsafe<Array<{ "QUERY PLAN": unknown }>>(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query.text}`, ...query.values);
        scenarios[label] = result[0]["QUERY PLAN"];
      }
      const lookup = await tx.$queryRawUnsafe('EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) SELECT "count" FROM "RateLimitBucket" WHERE "key" = $1', key);
      scenarios.keyLookup = lookup;
      scenarios.cleanup = await tx.$queryRawUnsafe(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)
        WITH expired AS (SELECT ctid FROM "RateLimitBucket" WHERE "updatedAt" < $1
          ORDER BY "updatedAt" LIMIT 1000 FOR UPDATE SKIP LOCKED)
        DELETE FROM "RateLimitBucket" WHERE ctid = ANY(ARRAY(SELECT ctid FROM expired))`, new Date(now.getTime() - 48 * 3600_000));
      const samples: number[] = [];
      for (let i = 0; i < 100; i++) {
        const result = await tx.$queryRawUnsafe<Array<{ "QUERY PLAN": Array<{ "Execution Time": number }> }>>(`EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${query.text}`, ...query.values);
        samples.push(result[0]["QUERY PLAN"][0]["Execution Time"]);
      }
      samples.sort((a, b) => a - b);
      report.exhaustedExecutionMs = { samples: samples.length, p50: samples[49], p95: samples[94], max: samples[99] };
      report.serverVersion = await tx.$queryRawUnsafe('SHOW server_version');
      throw rollback;
    }, { timeout: 60_000 });
  } catch (error) {
    if (error !== rollback) {
      console.error("EXPLAIN failed; raw errors omitted to protect connection details.");
      process.exitCode = 1;
    } else {
      report.rolledBack = true;
      mkdirSync("artifacts/performance", { recursive: true });
      writeFileSync("artifacts/performance/rate-limit-explain.json", JSON.stringify(report, null, 2) + "\n");
      console.log(JSON.stringify({ rolledBack: true, exhaustedExecutionMs: report.exhaustedExecutionMs, artifact: "artifacts/performance/rate-limit-explain.json" }));
    }
  } finally { await client.$disconnect(); }
}

void main().catch(() => { console.error("Invalid isolated test configuration; details omitted."); process.exitCode = 1; });

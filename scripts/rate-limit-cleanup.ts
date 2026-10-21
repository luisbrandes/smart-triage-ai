import "dotenv/config";
import { prisma } from "../src/server/db/prisma";
import { purgeExpiredRateLimitBuckets } from "../src/server/db/rate-limit-maintenance";

async function main() {
  if (!process.argv.includes("--execute")) {
    console.error("Requires --execute. Verify DATABASE_URL before running. Removes at most 1000 rate limit buckets older than 48 hours.");
    process.exitCode = 1;
  } else {
    try { console.log(JSON.stringify({ deletedBuckets: await purgeExpiredRateLimitBuckets() })); }
    catch { console.error("Rate limit maintenance failed; connection details omitted."); process.exitCode = 1; }
    finally { await prisma.$disconnect(); }
  }
}

void main().catch(() => { console.error("Maintenance configuration failed; details omitted."); process.exitCode = 1; });

import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

// Policies are bounded to 24 hours. The extra day protects recent windows.
export async function purgeExpiredRateLimitBuckets(now = new Date(), batchSize = 1000): Promise<number> {
  if (!Number.isFinite(now.getTime()) || !Number.isSafeInteger(batchSize) || batchSize < 1 || batchSize > 1000) {
    throw new Error("Invalid rate limit maintenance parameters.");
  }
  const cutoff = new Date(now.getTime() - 48 * 60 * 60_000);
  return prisma.$executeRaw(Prisma.sql`
    WITH expired AS (
      SELECT ctid FROM "RateLimitBucket"
      WHERE "updatedAt" < ${cutoff}
      ORDER BY "updatedAt"
      LIMIT ${batchSize}
      FOR UPDATE SKIP LOCKED
    )
    DELETE FROM "RateLimitBucket"
    WHERE ctid = ANY(ARRAY(SELECT ctid FROM expired))
  `);
}

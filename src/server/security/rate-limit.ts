import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

export type RateLimitPolicy = { limit: number; windowMs: number };
export type RateLimitResult =
  | { allowed: true; retryAfterSeconds: 0 }
  | { allowed: false; reason: "limited" | "unavailable" | "storage-missing"; retryAfterSeconds: number };

function isMissingRateLimitTable(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: unknown; meta?: { code?: unknown; message?: unknown } };
  return candidate.code === "P2010"
    && (candidate.meta?.code === "42P01"
      || (typeof candidate.meta?.message === "string" && candidate.meta.message.includes('relation "RateLimitBucket" does not exist')));
}

export function rateLimitKey(scope: string, subject: string): string {
  return createHash("sha256").update(`${scope}\0${subject}`).digest("hex");
}

export async function consumeRateLimit(scope: string, subject: string, policy: RateLimitPolicy, now = new Date()): Promise<RateLimitResult> {
  if (!scope || !subject || !Number.isSafeInteger(policy.limit) || policy.limit < 1 || !Number.isSafeInteger(policy.windowMs) || policy.windowMs < 1) {
    return { allowed: false, reason: "unavailable", retryAfterSeconds: 60 };
  }
  const key = rateLimitKey(scope, subject);
  const resetBefore = new Date(now.getTime() - policy.windowMs);
  const retryAfterSeconds = Math.max(1, Math.ceil(policy.windowMs / 1000));
  try {
    const rows = await prisma.$queryRaw<Array<{ count: number }>>(Prisma.sql`
      INSERT INTO "RateLimitBucket" ("key", "windowStartedAt", "count", "updatedAt")
      VALUES (${key}, ${now}, 1, ${now})
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimitBucket"."windowStartedAt" <= ${resetBefore} THEN 1 ELSE "RateLimitBucket"."count" + 1 END,
        "windowStartedAt" = CASE WHEN "RateLimitBucket"."windowStartedAt" <= ${resetBefore} THEN ${now} ELSE "RateLimitBucket"."windowStartedAt" END,
        "updatedAt" = ${now}
      RETURNING "count"
    `);
    if (Math.random() < 1 / 128) {
      await prisma.rateLimitBucket.deleteMany({ where: { updatedAt: { lt: new Date(now.getTime() - 24 * 60 * 60_000) } } });
    }
    const count = rows[0]?.count;
    if (typeof count !== "number") return { allowed: false, reason: "unavailable", retryAfterSeconds };
    return count <= policy.limit
      ? { allowed: true, retryAfterSeconds: 0 }
      : { allowed: false, reason: "limited", retryAfterSeconds };
  } catch (error) {
    if (isMissingRateLimitTable(error)) {
      // An unapplied additive migration must not block panel authentication.
      // Other protected operations still fail closed on this result.
      return { allowed: false, reason: "storage-missing", retryAfterSeconds };
    }
    // Fail closed: do not process protected work when distributed throttling is unavailable.
    return { allowed: false, reason: "unavailable", retryAfterSeconds };
  }
}

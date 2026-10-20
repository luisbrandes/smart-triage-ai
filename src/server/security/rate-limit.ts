import "server-only";

import { createHash } from "node:crypto";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/server/db/prisma";

export type RateLimitPolicy = { limit: number; windowMs: number };
export type RateLimitResult =
  | { allowed: true; retryAfterSeconds: 0 }
  | { allowed: false; reason: "limited" | "unavailable"; retryAfterSeconds: number };

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
  } catch {
    // Fail closed: do not process protected work when distributed throttling is unavailable.
    return { allowed: false, reason: "unavailable", retryAfterSeconds };
  }
}

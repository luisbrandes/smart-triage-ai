import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "@/server/db/prisma";
import { rateLimitQuery } from "@/server/db/rate-limit-query";
import { logServerOperation } from "@/server/observability/server-logger";

export type RateLimitPolicy = { limit: number; windowMs: number };
export type RateLimitResult =
  | { allowed: true; retryAfterSeconds: 0 }
  | { allowed: false; reason: "limited" | "unavailable"; retryAfterSeconds: number };

export function rateLimitKey(scope: string, subject: string): string {
  return createHash("sha256").update(`${scope}\0${subject}`).digest("hex");
}

export async function consumeRateLimit(scope: string, subject: string, policy: RateLimitPolicy, now = new Date()): Promise<RateLimitResult> {
  if (!scope || !subject || !Number.isSafeInteger(policy.limit) || policy.limit < 1 || policy.limit > 2_147_483_647 || !Number.isSafeInteger(policy.windowMs) || policy.windowMs < 1 || policy.windowMs > 24 * 60 * 60_000 || !Number.isFinite(now.getTime())) {
    return { allowed: false, reason: "unavailable", retryAfterSeconds: 60 };
  }
  const key = rateLimitKey(scope, subject);
  const resetBefore = new Date(now.getTime() - policy.windowMs);
  const retryAfterSeconds = Math.max(1, Math.ceil(policy.windowMs / 1000));
  try {
    const rows = await prisma.$queryRaw<Array<{ count: number }>>(rateLimitQuery(key, now, resetBefore, policy.limit));
    // A conflict with an exhausted window locks the row but does not rewrite it.
    if (rows.length === 0) return { allowed: false, reason: "limited", retryAfterSeconds };
    const count = rows[0]?.count;
    if (typeof count !== "number") return { allowed: false, reason: "unavailable", retryAfterSeconds };
    return count <= policy.limit
      ? { allowed: true, retryAfterSeconds: 0 }
      : { allowed: false, reason: "limited", retryAfterSeconds };
  } catch (error) {
    const failure = error as { code?: unknown; meta?: { code?: unknown } };
    const databaseCode = failure?.meta?.code ?? failure?.code;
    const errorCode = databaseCode === "42P01" || failure?.code === "P2021" ? "RATE_LIMIT_TABLE_MISSING"
      : databaseCode === "42501" ? "RATE_LIMIT_PERMISSION_DENIED"
      : databaseCode === "57014" ? "RATE_LIMIT_QUERY_TIMEOUT" : "RATE_LIMIT_STORAGE_UNAVAILABLE";
    logServerOperation({ operation: "rate-limit", correlationId: crypto.randomUUID(), actorType: "SYSTEM", entity: "RateLimitBucket", result: "FAILURE", errorCode });
    // Fail closed: do not process protected work when distributed throttling is unavailable.
    return { allowed: false, reason: "unavailable", retryAfterSeconds };
  }
}

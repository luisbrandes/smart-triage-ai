import "server-only";

import { headers } from "next/headers";
import { consumeRateLimit, type RateLimitPolicy, type RateLimitResult } from "@/server/security/rate-limit";

export async function consumeRequestRateLimit(scope: string, policy: RateLimitPolicy, subjectOverride?: string): Promise<RateLimitResult> {
  let subject = subjectOverride;
  if (!subject) {
    const requestHeaders = await headers();
    // Prefer Vercel's platform header, which is overwritten at its edge to prevent spoofing.
    subject = requestHeaders.get("x-vercel-forwarded-for")?.split(",", 1)[0]?.trim()
      || requestHeaders.get("x-forwarded-for")?.split(",", 1)[0]?.trim()
      || requestHeaders.get("x-real-ip")?.trim()
      || "unknown-client";
  }
  return consumeRateLimit(scope, subject, policy);
}

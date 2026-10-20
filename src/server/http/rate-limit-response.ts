import "server-only";

import { NextResponse } from "next/server";
import { consumeRequestRateLimit } from "@/server/security/request-rate-limit";
import type { RateLimitPolicy } from "@/server/security/rate-limit";

export async function rateLimitResponse(scope: string, policy: RateLimitPolicy, subject?: string): Promise<NextResponse | null> {
  const result = await consumeRequestRateLimit(scope, policy, subject);
  if (result.allowed) return null;
  const unavailable = result.reason !== "limited";
  return NextResponse.json({ error: unavailable ? "Proteção contra excesso de solicitações temporariamente indisponível." : "Muitas solicitações. Aguarde antes de tentar novamente." }, {
    status: unavailable ? 503 : 429,
    headers: { ...(unavailable ? {} : { "Retry-After": String(result.retryAfterSeconds) }), "Cache-Control": "no-store" },
  });
}

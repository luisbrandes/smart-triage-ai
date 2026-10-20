import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { consumeRateLimit, rateLimitKey } from "@/server/security/rate-limit";

describe("PostgreSQL: rate limit distribuído", () => {
  afterAll(async () => prisma.$disconnect());

  it("persists counters atomically across concurrent requests and stores only an opaque hash", async () => {
    const subject = `fake-client-${crypto.randomUUID()}`;
    const key = rateLimitKey("integration", subject);
    const results = await Promise.all(Array.from({ length: 20 }, () => consumeRateLimit("integration", subject, { limit: 5, windowMs: 60_000 })));
    expect(results.filter((result) => result.allowed)).toHaveLength(5);
    expect(results.filter((result) => !result.allowed && result.reason === "limited")).toHaveLength(15);
    expect(await prisma.rateLimitBucket.findUniqueOrThrow({ where: { key }, select: { key: true, count: true } })).toEqual({ key, count: 20 });
    expect(key).not.toContain(subject);
  });

  it("starts a fresh fixed window after expiration", async () => {
    const subject = `fake-client-${crypto.randomUUID()}`;
    const now = new Date("2026-10-19T12:00:00.000Z");
    expect(await consumeRateLimit("window", subject, { limit: 1, windowMs: 60_000 }, now)).toMatchObject({ allowed: true });
    expect(await consumeRateLimit("window", subject, { limit: 1, windowMs: 60_000 }, new Date(now.getTime() + 60_001))).toMatchObject({ allowed: true });
  });
});

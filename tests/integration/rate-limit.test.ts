import { afterAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { consumeRateLimit, rateLimitKey } from "@/server/security/rate-limit";
import { purgeExpiredRateLimitBuckets } from "@/server/db/rate-limit-maintenance";

describe("PostgreSQL: rate limit distribuído", () => {
  afterAll(async () => prisma.$disconnect());

  it("persists counters atomically across concurrent requests and stores only an opaque hash", async () => {
    const subject = `fake-client-${crypto.randomUUID()}`;
    const key = rateLimitKey("integration", subject);
    const results = await Promise.all(Array.from({ length: 20 }, () => consumeRateLimit("integration", subject, { limit: 5, windowMs: 60_000 })));
    expect(results.filter((result) => result.allowed)).toHaveLength(5);
    expect(results.filter((result) => !result.allowed && result.reason === "limited")).toHaveLength(15);
    expect(await prisma.rateLimitBucket.findUniqueOrThrow({ where: { key }, select: { key: true, count: true } })).toEqual({ key, count: 5 });
    expect(key).not.toContain(subject);
  });

  it("starts a fresh fixed window after expiration", async () => {
    const subject = `fake-client-${crypto.randomUUID()}`;
    const now = new Date("2026-10-19T12:00:00.000Z");
    expect(await consumeRateLimit("window", subject, { limit: 1, windowMs: 60_000 }, now)).toMatchObject({ allowed: true });
    expect(await consumeRateLimit("window", subject, { limit: 1, windowMs: 60_000 }, new Date(now.getTime() + 60_001))).toMatchObject({ allowed: true });
  });

  it("does not rewrite an exhausted bucket and resets exactly at the boundary", async () => {
    const subject = `fake-client-${crypto.randomUUID()}`;
    const now = new Date();
    const policy = { limit: 1, windowMs: 60_000 };
    await consumeRateLimit("boundary", subject, policy, now);
    const key = rateLimitKey("boundary", subject);
    const before = await prisma.rateLimitBucket.findUniqueOrThrow({ where: { key } });
    expect(await consumeRateLimit("boundary", subject, policy, new Date(now.getTime() + 59_999))).toMatchObject({ allowed: false, reason: "limited" });
    expect(await prisma.rateLimitBucket.findUniqueOrThrow({ where: { key } })).toEqual(before);
    expect(await consumeRateLimit("boundary", subject, policy, new Date(now.getTime() + 60_000))).toMatchObject({ allowed: true });
  });

  it("cleans only expired technical buckets with a bounded batch", async () => {
    const now = new Date();
    const keys = Array.from({ length: 3 }, () => rateLimitKey("cleanup", crypto.randomUUID()));
    const recentKey = rateLimitKey("cleanup-recent", crypto.randomUUID());
    await prisma.rateLimitBucket.create({ data: { key: recentKey, count: 1, windowStartedAt: now, updatedAt: now } });
    await prisma.rateLimitBucket.createMany({ data: keys.map((key) => ({ key, count: 1, windowStartedAt: new Date(now.getTime() - 72 * 3600_000), updatedAt: new Date(now.getTime() - 72 * 3600_000) })) });
    expect(await purgeExpiredRateLimitBuckets(now, 2)).toBe(2);
    expect(await prisma.rateLimitBucket.count({ where: { key: { in: keys } } })).toBeGreaterThanOrEqual(1);
    expect(await prisma.rateLimitBucket.findUnique({ where: { key: recentKey } })).not.toBeNull();
    await prisma.rateLimitBucket.deleteMany({ where: { key: { in: [...keys, recentKey] } } });
  });
});

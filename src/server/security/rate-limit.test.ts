import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ queryRaw: vi.fn(), deleteMany: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: { $queryRaw: mocks.queryRaw, rateLimitBucket: { deleteMany: mocks.deleteMany } } }));

import { consumeRateLimit } from "@/server/security/rate-limit";

describe("distributed rate limit", () => {
  afterEach(() => vi.restoreAllMocks());
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(Math, "random").mockReturnValue(0.5);
  });

  it("allows requests within the configured limit", async () => {
    mocks.queryRaw.mockResolvedValue([{ count: 1 }]);
    await expect(consumeRateLimit("test", "subject", { limit: 5, windowMs: 60_000 })).resolves.toEqual({ allowed: true, retryAfterSeconds: 0 });
  });

  it("blocks requests over the configured limit", async () => {
    mocks.queryRaw.mockResolvedValue([{ count: 6 }]);
    await expect(consumeRateLimit("test", "subject", { limit: 5, windowMs: 60_000 })).resolves.toEqual({ allowed: false, reason: "limited", retryAfterSeconds: 60 });
  });

  it("fails closed if the distributed storage table is missing or unavailable", async () => {
    mocks.queryRaw.mockRejectedValue(Object.assign(new Error("missing relation"), { code: "P2010", meta: { code: "42P01" } }));
    await expect(consumeRateLimit("nurse-login", "subject", { limit: 5, windowMs: 900_000 })).resolves.toEqual({ allowed: false, reason: "unavailable", retryAfterSeconds: 900 });
  });
});

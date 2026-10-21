import { describe, expect, it } from "vitest";
import { resolveConnectionTimeoutMillis } from "@/server/db/connection-timeout";

describe("database connection timeout", () => {
  it("allows 30 seconds for the remote pooled database", () => {
    expect(resolveConnectionTimeoutMillis("postgresql://fake:fake@pooled.db.prisma.io/postgres")).toBe(30_000);
  });
  it.each(["localhost", "127.0.0.1", "[::1]"])("fails faster for local host %s", (host) => {
    expect(resolveConnectionTimeoutMillis(`postgresql://fake:fake@${host}/fake_test`)).toBe(5_000);
  });
  it("accepts an explicit connection timeout", () => {
    expect(resolveConnectionTimeoutMillis("postgresql://fake:fake@localhost/fake_test", "30000")).toBe(30_000);
  });
  it.each(["0", "-1", "abc", "1.5", "120001"])("rejects an invalid override without echoing it: %s", (value) => {
    expect(() => resolveConnectionTimeoutMillis("postgresql://fake:fake@localhost/fake_test", value)).toThrow("DATABASE_CONNECTION_TIMEOUT_MS deve ser um inteiro entre 1 e 120000.");
  });
});

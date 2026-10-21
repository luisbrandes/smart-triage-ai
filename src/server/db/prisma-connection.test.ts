import { createServer, type Socket } from "node:net";
import { afterEach, expect, it, vi } from "vitest";

afterEach(() => vi.unstubAllEnvs());

it("bounds connection attempts when TCP accepts but PostgreSQL never responds", async () => {
  const sockets = new Set<Socket>();
  const server = createServer((socket) => {
    sockets.add(socket);
    socket.resume();
    socket.on("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Missing local test port");
  vi.stubEnv("DATABASE_URL", `postgresql://fake:fake@127.0.0.1:${address.port}/fake_connection_test`);
  vi.stubEnv("NODE_ENV", "production");

  const { prisma } = await import("@/server/db/prisma");
  vi.resetModules();
  const reloaded = await import("@/server/db/prisma");
  expect(reloaded.prisma).toBe(prisma);
  const startedAt = Date.now();
  try {
    await expect(prisma.$queryRawUnsafe("SELECT 1")).rejects.toThrow();
    expect(Date.now() - startedAt).toBeLessThan(8_000);
  } finally {
    for (const socket of sockets) socket.destroy();
    await prisma.$disconnect();
    delete (globalThis as unknown as { prisma?: unknown }).prisma;
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
}, 12_000);

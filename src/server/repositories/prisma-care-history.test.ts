import { describe, expect, it, vi } from "vitest";

const { findMany } = vi.hoisted(() => ({ findMany: vi.fn() }));
vi.mock("@/server/db/prisma", () => ({ prisma: { careAttendance: { findMany } } }));

import { PrismaNursingQueueRepository } from "@/server/repositories/prisma-nursing-queue-repository";

describe("histórico da fila de atendimento", () => {
  it("inclui atendimentos concluídos persistidos", async () => {
    findMany.mockResolvedValueOnce([{
      status: "COMPLETED", destination: null, queuedAt: new Date("2026-01-01T10:00:00Z"), calledAt: new Date("2026-01-01T10:05:00Z"), serviceStartedAt: new Date("2026-01-01T10:06:00Z"), completedAt: new Date("2026-01-01T10:20:00Z"),
      triage: { id: "triage-1", finalHumanPriority: "GREEN", patient: { displayName: "Pessoa Fictícia", birthDate: null }, queueTicket: { publicCode: "T-20260101-001" } },
    }]);
    const items = await new PrismaNursingQueueRepository().listCareQueue(new Date("2026-01-01T11:00:00Z"));
    expect(findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { status: { in: ["WAITING", "CALLED", "IN_SERVICE", "COMPLETED"] } } }));
    expect(items).toHaveLength(1);
    expect(items[0].status).toBe("COMPLETED");
    expect(items[0].completedAt).toEqual(new Date("2026-01-01T10:20:00Z"));
  });
});

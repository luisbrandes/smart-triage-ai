import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "@/server/db/prisma";
import { issueQueueTicket } from "@/server/application/queue-ticket/issue-queue-ticket";
import { PrismaQueueTicketRepository } from "@/server/repositories/prisma-queue-ticket-repository";

const triageId = "90000000-0000-4000-8000-000000000001";
describe("PostgreSQL: senha e concorrência", () => {
  beforeAll(async () => { await prisma.$executeRawUnsafe('TRUNCATE TABLE "AuditEvent", "QueueTicket", "Triage" CASCADE'); await prisma.triage.create({ data: { id: triageId, status: "AWAITING_NURSE_REVIEW" } }); });
  afterAll(async () => { await prisma.$disconnect(); });
  it("duas emissões concorrentes criam uma senha e auditoria única", async () => { const repository = new PrismaQueueTicketRepository(); const [left, right] = await Promise.all([issueQueueTicket(repository, triageId, new Date("2026-07-12T10:00:00Z")), issueQueueTicket(repository, triageId, new Date("2026-07-12T10:00:00Z"))]); expect(left.publicCode).toBe(right.publicCode); expect(await prisma.queueTicket.count({ where: { triageId } })).toBe(1); expect(await prisma.auditEvent.count({ where: { triageId, action: "QUEUE_TICKET_ISSUED" } })).toBe(1); });
  it("rejeita alteração de evento de auditoria", async () => { const event = await prisma.auditEvent.findFirstOrThrow({ where: { triageId } }); await expect(prisma.auditEvent.update({ where: { id: event.id }, data: { action: "ALTERED" } })).rejects.toThrow(); });
});

import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { formatQueueTicket, operationalDateUtc } from "@/domain/queue-ticket/queue-ticket";

export async function ensureQueueTicket(transaction: Prisma.TransactionClient, triageId: string, issuedAt: Date) {
  const existing = await transaction.queueTicket.findUnique({ where: { triageId } });
  if (existing) return existing;
  const operationalDate = operationalDateUtc(issuedAt);
  const dateKey = operationalDate.toISOString().slice(0, 10);
  await transaction.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtext(${dateKey}))`;
  const latest = await transaction.queueTicket.findFirst({ where: { operationalDate }, orderBy: { sequenceNumber: "desc" }, select: { sequenceNumber: true } });
  const sequenceNumber = (latest?.sequenceNumber ?? 0) + 1;
  const ticket = await transaction.queueTicket.create({ data: { triageId, publicCode: formatQueueTicket(operationalDate, sequenceNumber), operationalDate, sequenceNumber, status: "ACTIVE", issuedAt } });
  await transaction.auditEvent.createMany({ data: [
    { triageId, entityType: "QueueTicket", entityId: ticket.id, action: "QUEUE_TICKET_ISSUED", actorType: "SYSTEM", actorReference: "QUEUE_TICKET_SERVICE", sanitizedMetadata: { operationalDate: dateKey, sequenceNumber, ticketStatus: "ACTIVE", triageStatus: "AWAITING_NURSE_REVIEW" } },
    { triageId, entityType: "Triage", entityId: triageId, action: "PATIENT_FLOW_COMPLETED", actorType: "SYSTEM", actorReference: "TRIAGE_WORKFLOW", sanitizedMetadata: { triageStatus: "AWAITING_NURSE_REVIEW", ticketStatus: "ACTIVE" } },
  ] });
  return ticket;
}

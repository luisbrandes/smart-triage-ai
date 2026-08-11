import "server-only";

import { Prisma } from "@/generated/prisma/client";
import { QueueTicketIssuanceError } from "@/server/application/queue-ticket/queue-ticket-errors";
import type { IssueQueueTicketInput, QueueTicketRepository } from "@/server/application/queue-ticket/queue-ticket-repository";
import type { QueueTicketDto } from "@/server/application/queue-ticket/queue-ticket-types";
import { prisma } from "@/server/db/prisma";

const MAX_TRANSACTION_ATTEMPTS = 3;

function toDto(ticket: { publicCode: string; operationalDate: Date; sequenceNumber: number; status: string; issuedAt: Date }): QueueTicketDto {
  return { publicCode: ticket.publicCode, operationalDate: ticket.operationalDate.toISOString().slice(0, 10), sequenceNumber: ticket.sequenceNumber, status: "ACTIVE", issuedAt: ticket.issuedAt, triageStatus: "AWAITING_NURSE_REVIEW" };
}

export class PrismaQueueTicketRepository implements QueueTicketRepository {
  async findByTriageId(triageId: string): Promise<QueueTicketDto | null> {
    const ticket = await prisma.queueTicket.findUnique({ where: { triageId } });
    return ticket ? toDto(ticket) : null;
  }
  async issue(input: IssueQueueTicketInput): Promise<QueueTicketDto> {
    for (let attempt = 1; attempt <= MAX_TRANSACTION_ATTEMPTS; attempt += 1) {
      try {
        return await prisma.$transaction(async (transaction) => {
          const triage = await transaction.triage.findUnique({ where: { id: input.triageId }, include: { queueTicket: true } });
          if (!triage || triage.status !== "AWAITING_NURSE_REVIEW") throw new QueueTicketIssuanceError();
          if (triage.queueTicket) return toDto(triage.queueTicket);

          const latest = await transaction.queueTicket.findFirst({ where: { operationalDate: input.operationalDate }, orderBy: { sequenceNumber: "desc" }, select: { sequenceNumber: true } });
          const sequenceNumber = (latest?.sequenceNumber ?? 0) + 1;
          const ticket = await transaction.queueTicket.create({ data: { triageId: input.triageId, publicCode: input.formatPublicCode(sequenceNumber), operationalDate: input.operationalDate, sequenceNumber, status: "ACTIVE", issuedAt: input.issuedAt } });
          await transaction.auditEvent.createMany({ data: [
            { triageId: input.triageId, entityType: "QueueTicket", entityId: ticket.id, action: "QUEUE_TICKET_ISSUED", actorType: "SYSTEM", sanitizedMetadata: { operationalDate: input.operationalDate.toISOString().slice(0, 10), sequenceNumber, ticketStatus: "ACTIVE", triageStatus: triage.status } },
            { triageId: input.triageId, entityType: "Triage", entityId: input.triageId, action: "PATIENT_FLOW_COMPLETED", actorType: "PATIENT", sanitizedMetadata: { triageStatus: triage.status, ticketStatus: "ACTIVE" } },
          ] });
          return toDto(ticket);
        }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      } catch (error: unknown) {
        const retryable = error instanceof Prisma.PrismaClientKnownRequestError && (error.code === "P2002" || error.code === "P2034");
        if (!retryable || attempt === MAX_TRANSACTION_ATTEMPTS) {
          if (retryable) {
            const existing = await prisma.queueTicket.findUnique({ where: { triageId: input.triageId } });
            if (existing) return toDto(existing);
          }
          throw error;
        }
      }
    }
    throw new QueueTicketIssuanceError("Não foi possível emitir a senha.");
  }
}

import { formatQueueTicket, operationalDateUtc } from "@/domain/queue-ticket/queue-ticket";
import type { QueueTicketRepository } from "@/server/application/queue-ticket/queue-ticket-repository";

export async function issueQueueTicket(repository: QueueTicketRepository, triageId: string, now = new Date()) {
  const operationalDate = operationalDateUtc(now);
  return repository.issue({
    triageId,
    operationalDate,
    formatPublicCode: (sequence) => formatQueueTicket(operationalDate, sequence),
    issuedAt: now,
  });
}

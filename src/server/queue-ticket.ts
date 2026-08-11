import "server-only";

import { issueQueueTicket } from "@/server/application/queue-ticket/issue-queue-ticket";
import { PrismaQueueTicketRepository } from "@/server/repositories/prisma-queue-ticket-repository";

const repository = new PrismaQueueTicketRepository();

export const queueTicket = { issue: (triageId: string) => issueQueueTicket(repository, triageId), find: (triageId: string) => repository.findByTriageId(triageId) };

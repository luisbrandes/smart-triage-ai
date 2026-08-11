import type { QueueTicketDto } from "@/server/application/queue-ticket/queue-ticket-types";

export type IssueQueueTicketInput = {
  triageId: string;
  operationalDate: Date;
  formatPublicCode: (sequenceNumber: number) => string;
  issuedAt: Date;
};

export interface QueueTicketRepository {
  issue(input: IssueQueueTicketInput): Promise<QueueTicketDto>;
  findByTriageId(triageId: string): Promise<QueueTicketDto | null>;
}

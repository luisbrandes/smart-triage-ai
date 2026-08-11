import { describe, expect, it } from "vitest";

import { issueQueueTicket } from "@/server/application/queue-ticket/issue-queue-ticket";
import type { IssueQueueTicketInput, QueueTicketRepository } from "@/server/application/queue-ticket/queue-ticket-repository";

class InMemoryQueueTicketRepository implements QueueTicketRepository {
  private tickets = new Map<string, Awaited<ReturnType<QueueTicketRepository["issue"]>>>();
  private sequences = new Map<string, number>();
  statuses = new Map<string, string>();
  nurseReviews = 0;

  async findByTriageId(triageId: string) { return this.tickets.get(triageId) ?? null; }

  async issue(input: IssueQueueTicketInput) {
    const existing = this.tickets.get(input.triageId);
    if (existing) return existing;
    if (this.statuses.get(input.triageId) !== "AWAITING_NURSE_REVIEW") throw new Error("invalid status");
    const key = input.operationalDate.toISOString();
    const sequenceNumber = (this.sequences.get(key) ?? 0) + 1;
    this.sequences.set(key, sequenceNumber);
    const ticket = { publicCode: input.formatPublicCode(sequenceNumber), operationalDate: key.slice(0, 10), sequenceNumber, status: "ACTIVE" as const, issuedAt: input.issuedAt, triageStatus: "AWAITING_NURSE_REVIEW" as const };
    this.tickets.set(input.triageId, ticket);
    return ticket;
  }
}

describe("issueQueueTicket", () => {
  it("retorna a mesma senha para a mesma triagem", async () => {
    const repository = new InMemoryQueueTicketRepository();
    repository.statuses.set("triage-1", "AWAITING_NURSE_REVIEW");
    const first = await issueQueueTicket(repository, "triage-1", new Date("2026-07-12T10:00:00Z"));
    const repeated = await issueQueueTicket(repository, "triage-1", new Date("2026-07-12T11:00:00Z"));
    expect(repeated).toEqual(first);
    expect(first.publicCode).toBe("T-20260712-001");
  });

  it("atribui sequências distintas e reinicia a unicidade por data", async () => {
    const repository = new InMemoryQueueTicketRepository();
    for (const id of ["triage-1", "triage-2", "triage-3"]) repository.statuses.set(id, "AWAITING_NURSE_REVIEW");
    const first = await issueQueueTicket(repository, "triage-1", new Date("2026-07-12T10:00:00Z"));
    const second = await issueQueueTicket(repository, "triage-2", new Date("2026-07-12T10:00:00Z"));
    const nextDay = await issueQueueTicket(repository, "triage-3", new Date("2026-07-13T10:00:00Z"));
    expect([first.sequenceNumber, second.sequenceNumber, nextDay.sequenceNumber]).toEqual([1, 2, 1]);
    expect(new Set([first.publicCode, second.publicCode, nextDay.publicCode]).size).toBe(3);
    expect(repository.nurseReviews).toBe(0);
    expect(repository.statuses.get("triage-1")).not.toBe("CLASSIFIED");
  });

  it("rejeita triagem em estado inválido", async () => {
    const repository = new InMemoryQueueTicketRepository();
    repository.statuses.set("triage-1", "FINAL_ANALYSIS_PENDING");
    await expect(issueQueueTicket(repository, "triage-1")).rejects.toThrow("invalid status");
  });
});

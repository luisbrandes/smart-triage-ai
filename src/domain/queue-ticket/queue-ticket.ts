export const QUEUE_TICKET_PREFIX = "T";

export function operationalDateUtc(now: Date): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function formatQueueTicket(date: Date, sequenceNumber: number): string {
  if (!Number.isInteger(sequenceNumber) || sequenceNumber < 1) {
    throw new RangeError("A sequência da senha deve ser um inteiro positivo.");
  }

  const datePart = [date.getUTCFullYear(), String(date.getUTCMonth() + 1).padStart(2, "0"), String(date.getUTCDate()).padStart(2, "0")].join("");
  return `${QUEUE_TICKET_PREFIX}-${datePart}-${String(sequenceNumber).padStart(3, "0")}`;
}

import { describe, expect, it } from "vitest";

import { formatQueueTicket, operationalDateUtc } from "@/domain/queue-ticket/queue-ticket";

describe("senha operacional", () => {
  it("centraliza prefixo, data UTC e sequência legível", () => {
    const date = operationalDateUtc(new Date("2026-07-12T23:59:59-03:00"));
    expect(date.toISOString()).toBe("2026-07-13T00:00:00.000Z");
    expect(formatQueueTicket(date, 7)).toBe("T-20260713-007");
  });

  it("rejeita sequências inválidas", () => {
    expect(() => formatQueueTicket(new Date(), 0)).toThrow(RangeError);
  });
});

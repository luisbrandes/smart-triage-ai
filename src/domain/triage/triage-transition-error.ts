import type { TriageStatus } from "@/domain/triage/triage-status";

export class InvalidTriageTransitionError extends Error {
  readonly from: TriageStatus;
  readonly to: TriageStatus;

  constructor(from: TriageStatus, to: TriageStatus) {
    super(`Transição de triagem inválida: ${from} -> ${to}.`);
    this.name = "InvalidTriageTransitionError";
    this.from = from;
    this.to = to;
  }
}

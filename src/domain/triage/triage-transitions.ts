import { InvalidTriageTransitionError } from "@/domain/triage/triage-transition-error";
import type { TriageStatus } from "@/domain/triage/triage-status";

const transitions = {
  DRAFT: ["IDENTIFICATION_IN_PROGRESS", "CANCELLED"],
  IDENTIFICATION_IN_PROGRESS: ["ANAMNESIS_IN_PROGRESS", "CANCELLED"],
  ANAMNESIS_IN_PROGRESS: ["VITAL_SIGNS_REQUIRED", "CANCELLED"],
  VITAL_SIGNS_REQUIRED: ["VITAL_SIGNS_IN_PROGRESS", "AWAITING_NURSE_REVIEW"],
  VITAL_SIGNS_IN_PROGRESS: ["FINAL_ANALYSIS_PENDING", "AWAITING_NURSE_REVIEW"],
  FINAL_ANALYSIS_PENDING: ["AWAITING_NURSE_REVIEW", "CANCELLED"],
  AWAITING_NURSE_REVIEW: ["RECOLLECTION_REQUESTED", "CLASSIFIED", "CARE_WAITING"],
  RECOLLECTION_REQUESTED: ["VITAL_SIGNS_IN_PROGRESS"],
  CLASSIFIED: ["REFERRED_TO_CARE", "CARE_WAITING"],
  REFERRED_TO_CARE: ["CLOSED"],
  CARE_WAITING: ["CALLED"],
  CALLED: ["IN_SERVICE", "CARE_WAITING"],
  IN_SERVICE: ["COMPLETED"],
  COMPLETED: ["CLOSED"],
  CLOSED: [],
  CANCELLED: [],
} as const satisfies Record<TriageStatus, readonly TriageStatus[]>;

export function canTransitionTriage(from: TriageStatus, to: TriageStatus): boolean {
  return (transitions[from] as readonly TriageStatus[]).includes(to);
}

export function assertTriageTransition(from: TriageStatus, to: TriageStatus): void {
  if (!canTransitionTriage(from, to)) {
    throw new InvalidTriageTransitionError(from, to);
  }
}

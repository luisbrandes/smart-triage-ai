import type { NursingPriority } from "@/server/application/nursing/nursing-types";

export type NursingMutationResult = { success: true; status: "CLASSIFIED" | "RECOLLECTION_REQUESTED" | "REFERRED_TO_CARE" | "CARE_WAITING" | "CALLED" | "IN_SERVICE" | "COMPLETED"; ticketCode?: string } | { success: false; message: string; errors?: Record<string, string[]> };

export type ClassificationInput = { priority: NursingPriority; justification?: string };
export type RecollectionInput = { reason: string };
export type ReferralInput = { destination?: string; notes?: string };

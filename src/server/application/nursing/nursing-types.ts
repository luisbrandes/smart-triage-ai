export type NursingPriority = "RED" | "YELLOW" | "GREEN";

export type NursingQueueItemDto = {
  triageId: string;
  ticketCode: string;
  displayName: string;
  ageYears: number | null;
  mainComplaint: string;
  recommendedPriority: NursingPriority;
  enteredQueueAt: Date;
  waitingMinutes: number;
  hasVitalSigns: boolean;
  hasDemoAlert: boolean;
};

export type NursingQueueDto = {
  items: NursingQueueItemDto[];
  indicators: { awaitingReview: number; elevatedPriority: number; withVitalSigns: number; oldestWaitingMinutes: number | null };
};

export type NursingReferralItemDto = {
  triageId: string;
  ticketCode: string;
  displayName: string;
  ageYears: number | null;
  finalPriority: NursingPriority;
  destination: string | null;
  referredAt: Date;
};

export type CareQueueItemDto = {
  triageId: string;
  ticketCode: string;
  displayName: string;
  ageYears: number | null;
  priority: NursingPriority;
  status: "WAITING" | "CALLED" | "IN_SERVICE" | "COMPLETED";
  destination: string | null;
  queuedAt: Date;
  calledAt: Date | null;
  serviceStartedAt: Date | null;
  completedAt: Date | null;
};

export type NursingAnalysisDto = {
  type: "FINAL";
  priority: NursingPriority;
  rulesetVersion: string;
  executedAt: Date;
  reasons: string[];
};

export type NursingCollectionAttemptDto = {
  attemptNumber: number;
  origin: "MANUAL" | "SIMULATED_DEVICE" | "PHYSICAL_DEVICE";
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  current: boolean;
  physicalReading: { temperature: number; weight: number | null; height: number | null; receivedAt: Date } | null;
  readings: { type: "HEART_RATE" | "SPO2"; value: number; unit: string; accepted: boolean }[];
};

export type NursingTriageDetailDto = {
  ticketCode: string;
  status: "AWAITING_NURSE_REVIEW" | "RECOLLECTION_REQUESTED" | "CLASSIFIED" | "REFERRED_TO_CARE" | "CARE_WAITING" | "CALLED" | "IN_SERVICE" | "COMPLETED";
  displayName: string;
  ageYears: number | null;
  healthPlan: string | null;
  anamnesis: {
    mainComplaint: string;
    additionalDescription: string | null;
    subjectiveIntensity: number | null;
    symptomStartedAt: Date | null;
    approximateDuration: string | null;
    declaredAllergies: string | null;
    declaredMedications: string | null;
    declaredPreexistingConditions: string | null;
    demoAlerts: { questionKey: string; answer: "yes" | "no" }[];
  };
  analyses: NursingAnalysisDto[];
  currentRecommendedPriority: NursingPriority;
  humanDecision: { priority: NursingPriority; decision: "CONFIRMED" | "RECLASSIFIED"; justification: string | null; reviewedAt: Date } | null;
  referral: { destination: string | null; notes: string | null; referredAt: Date | null } | null;
  collectionAttempts: NursingCollectionAttemptDto[];
  timeline: { label: string; occurredAt: Date }[];
};

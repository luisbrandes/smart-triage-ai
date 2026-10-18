import type { TriageStatus } from "@/domain/triage/triage-status";

export type IdentificationInput = {
  displayName: string;
  birthDate: Date;
  sex?: string;
  documentReference?: string;
  cpf?: string;
  phone?: string;
  email?: string;
  motherName?: string;
  legalRepresentativeName?: string;
  legalRepresentativePhone?: string;
  hasHealthPlan: boolean;
  planName?: string;
};

export type ConsentInput = {
  termsVersion: string;
  acceptedAt: Date;
};

export type AnamnesisInput = {
  catalogVersion: string;
  mainComplaint: string;
  additionalDescription?: string;
  subjectiveIntensity: number;
  approximateDuration: string;
  declaredAllergies?: string;
  declaredMedications?: string;
  declaredPreexistingConditions?: string;
  alertAnswers: Record<string, "yes" | "no">;
};

export type PatientIntakeSession = {
  triageId: string;
  patientId: string | null;
  status: TriageStatus;
};

export type ValidationFailure = {
  success: false;
  errors: Record<string, string[]>;
};

export type ValidationSuccess = { success: true };
export type IntakeValidationResult = ValidationFailure | ValidationSuccess;

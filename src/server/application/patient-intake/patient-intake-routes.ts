import type { TriageStatus } from "@/domain/triage/triage-status";

export function isPatientIntakeResumable(status: TriageStatus): boolean {
  return status === "IDENTIFICATION_IN_PROGRESS"
    || status === "ANAMNESIS_IN_PROGRESS"
    || status === "VITAL_SIGNS_REQUIRED"
    || status === "VITAL_SIGNS_IN_PROGRESS"
    || status === "RECOLLECTION_REQUESTED";
}

export function routeForPatientIntakeStatus(status: TriageStatus, hasPatient: boolean): string {
  if (status === "IDENTIFICATION_IN_PROGRESS") return hasPatient ? "/paciente/triagem/consentimento" : "/paciente/triagem/identificacao";
  if (status === "ANAMNESIS_IN_PROGRESS") return "/paciente/triagem/anamnese";
  if (status === "VITAL_SIGNS_REQUIRED" || status === "VITAL_SIGNS_IN_PROGRESS" || status === "RECOLLECTION_REQUESTED") return "/paciente/coleta";
  if (status === "AWAITING_NURSE_REVIEW") return "/paciente/triagem/concluida";
  return "/paciente";
}

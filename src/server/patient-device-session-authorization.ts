import "server-only";

import { getDemoTriageId } from "@/server/demo-triage-session";
import { patientIntake } from "@/server/patient-intake";

export async function authorizedPatientTriageId(): Promise<string | null> {
  const triageId = await getDemoTriageId();
  if (!triageId) return null;
  const triage = await patientIntake.findSession(triageId);
  if (!triage || (triage.status !== "VITAL_SIGNS_REQUIRED" && triage.status !== "VITAL_SIGNS_IN_PROGRESS" && triage.status !== "RECOLLECTION_REQUESTED")) return null;
  return triageId;
}

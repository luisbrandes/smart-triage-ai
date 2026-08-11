import "server-only";

import { getDemoTriageId } from "@/server/demo-triage-session";
import { patientIntake } from "@/server/patient-intake";

export async function resolvePatientIntakeSession() {
  const triageId = await getDemoTriageId();
  return triageId ? patientIntake.findSession(triageId) : null;
}

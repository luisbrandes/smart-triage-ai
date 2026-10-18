import type { AnamnesisInput, ConsentInput, IdentificationInput, PatientIntakeSession } from "@/server/application/patient-intake/patient-intake-types";

export interface PatientIntakeRepository {
  startTriage(): Promise<PatientIntakeSession>;
  startNewDemo(previousTriageId: string): Promise<PatientIntakeSession>;
  requestRecollection(triageId: string): Promise<void>;
  cancelTriage(triageId: string): Promise<void>;
  findSession(triageId: string): Promise<PatientIntakeSession | null>;
  saveIdentification(triageId: string, input: IdentificationInput): Promise<void>;
  acceptConsent(triageId: string, input: ConsentInput): Promise<void>;
  completeAnamnesis(triageId: string, input: AnamnesisInput): Promise<void>;
}

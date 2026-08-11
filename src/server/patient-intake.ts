import "server-only";

import { acceptPatientConsent, completePatientAnamnesis, getPatientIntakeSession, savePatientIdentification, startNewPatientDemo, startPatientTriage } from "@/server/application/patient-intake/patient-intake-use-cases";
import { PrismaPatientIntakeRepository } from "@/server/repositories/prisma-patient-intake-repository";

const repository = new PrismaPatientIntakeRepository();

export const patientIntake = {
  start: () => startPatientTriage(repository),
  startNewDemo: (previousTriageId: string) => startNewPatientDemo(repository, previousTriageId),
  findSession: (triageId: string) => getPatientIntakeSession(repository, triageId),
  saveIdentification: (triageId: string, input: unknown) => savePatientIdentification(repository, triageId, input),
  acceptConsent: (triageId: string, input: unknown) => acceptPatientConsent(repository, triageId, input),
  completeAnamnesis: (triageId: string, input: unknown) => completePatientAnamnesis(repository, triageId, input),
};

import { demoAnamnesis } from "@/demo/anamnesis";
import { demoConsent } from "@/demo/consent";
import type { PatientIntakeRepository } from "@/server/application/patient-intake/patient-intake-repository";
import type { IntakeValidationResult, PatientIntakeSession } from "@/server/application/patient-intake/patient-intake-types";
import { anamnesisSchema, consentSchema, fieldErrors, identificationSchema } from "@/server/application/patient-intake/patient-intake-validation";

export async function startPatientTriage(repository: PatientIntakeRepository): Promise<PatientIntakeSession> {
  return repository.startTriage();
}

export async function startNewPatientDemo(repository: PatientIntakeRepository, previousTriageId: string): Promise<PatientIntakeSession> {
  return repository.startNewDemo(previousTriageId);
}

export async function requestPatientRecollection(repository: PatientIntakeRepository, triageId: string): Promise<void> {
  return repository.requestRecollection(triageId);
}

export async function cancelPatientTriage(repository: PatientIntakeRepository, triageId: string): Promise<void> {
  return repository.cancelTriage(triageId);
}

export async function getPatientIntakeSession(repository: PatientIntakeRepository, triageId: string): Promise<PatientIntakeSession | null> {
  return repository.findSession(triageId);
}

export async function savePatientIdentification(repository: PatientIntakeRepository, triageId: string, input: unknown): Promise<IntakeValidationResult> {
  const parsed = identificationSchema.safeParse(input);
  if (!parsed.success) return { success: false, errors: fieldErrors(parsed.error) };

  await repository.saveIdentification(triageId, {
    displayName: parsed.data.displayName,
    birthDate: new Date(`${parsed.data.birthDate}T00:00:00.000Z`),
    sex: parsed.data.sex || undefined,
    documentReference: parsed.data.documentReference || undefined,
    cpf: parsed.data.cpf || undefined,
    phone: parsed.data.phone || undefined,
    email: parsed.data.email || undefined,
    motherName: parsed.data.motherName || undefined,
    legalRepresentativeName: parsed.data.legalRepresentativeName || undefined,
    legalRepresentativePhone: parsed.data.legalRepresentativePhone || undefined,
    hasHealthPlan: parsed.data.hasHealthPlan === "yes",
    planName: parsed.data.planName || undefined,
  });
  return { success: true };
}

export async function acceptPatientConsent(repository: PatientIntakeRepository, triageId: string, input: unknown): Promise<IntakeValidationResult> {
  const parsed = consentSchema.safeParse(input);
  if (!parsed.success) return { success: false, errors: fieldErrors(parsed.error) };

  await repository.acceptConsent(triageId, { termsVersion: demoConsent.version, acceptedAt: new Date() });
  return { success: true };
}

export async function completePatientAnamnesis(repository: PatientIntakeRepository, triageId: string, input: unknown): Promise<IntakeValidationResult> {
  const parsed = anamnesisSchema.safeParse(input);
  if (!parsed.success) return { success: false, errors: fieldErrors(parsed.error) };

  await repository.completeAnamnesis(triageId, {
    catalogVersion: demoAnamnesis.version,
    mainComplaint: parsed.data.mainComplaint,
    additionalDescription: parsed.data.additionalDescription || undefined,
    subjectiveIntensity: parsed.data.subjectiveIntensity,
    approximateDuration: parsed.data.approximateDuration,
    declaredAllergies: parsed.data.declaredAllergies || undefined,
    declaredMedications: parsed.data.declaredMedications || undefined,
    declaredPreexistingConditions: parsed.data.declaredPreexistingConditions || undefined,
    alertAnswers: parsed.data.alertAnswers,
  });
  return { success: true };
}

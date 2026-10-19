"use server";

import { redirect } from "next/navigation";

import { demoAnamnesis } from "@/demo/anamnesis";
import { clearDemoTriageId, getDemoTriageId, setDemoTriageId } from "@/server/demo-triage-session";
import { patientIntake } from "@/server/patient-intake";
import { isPatientIntakeResumable, routeForPatientIntakeStatus } from "@/server/application/patient-intake/patient-intake-routes";
import { classifyIdentificationSaveError } from "@/server/application/patient-intake/identification-save-error";

export type IntakeActionState = {
  message?: string;
  errors?: Record<string, string[]>;
};

async function currentTriageId(): Promise<string | null> {
  return getDemoTriageId();
}

export async function startDemoTriageAction(): Promise<never> {
  const existingId = await currentTriageId();
  if (existingId) {
    const existing = await patientIntake.findSession(existingId);
    if (existing && isPatientIntakeResumable(existing.status)) redirect(routeForPatientIntakeStatus(existing.status, Boolean(existing.patientId)));
    if (existing) {
      const session = await patientIntake.startNewDemo(existingId);
      await setDemoTriageId(session.triageId);
      redirect("/paciente/triagem/identificacao");
    }
  }

  const session = await patientIntake.start();
  await setDemoTriageId(session.triageId);
  redirect("/paciente/triagem/identificacao");
}

export async function startNewDemoTriageAction(): Promise<never> {
  const previousTriageId = await currentTriageId();
  const session = previousTriageId ? await patientIntake.startNewDemo(previousTriageId) : await patientIntake.start();
  await setDemoTriageId(session.triageId);
  redirect("/paciente/triagem/identificacao");
}

export async function requestPatientRecollectionAction(): Promise<never> {
  const triageId = await currentTriageId();
  if (!triageId) redirect("/paciente");
  await patientIntake.requestRecollection(triageId);
  redirect("/paciente/coleta");
}

export async function cancelPatientTriageAction(): Promise<never> {
  const triageId = await currentTriageId();
  if (triageId) await patientIntake.cancel(triageId);
  await clearDemoTriageId();
  redirect("/paciente");
}

export async function saveIdentificationAction(_previous: IntakeActionState, formData: FormData): Promise<IntakeActionState> {
  const triageId = await currentTriageId();
  if (!triageId) {
    console.warn("patient_identification_save_rejected", { category: "session_missing" });
    return { message: "Inicie uma nova triagem." };
  }

  try {
    const result = await patientIntake.saveIdentification(triageId, {
      displayName: formData.get("displayName"),
      birthDate: formData.get("birthDate"),
      sex: formData.get("sex") || undefined,
      documentReference: formData.get("documentReference") || undefined,
      hasHealthPlan: formData.get("hasHealthPlan"),
      planName: formData.get("planName") || undefined,
    });
    if (!result.success) {
      console.info("patient_identification_save_rejected", {
        triageId,
        category: "validation",
        fields: Object.keys(result.errors).sort(),
      });
      return { errors: result.errors };
    }
    console.info("patient_identification_save_succeeded", { triageId });
  } catch (error) {
    const failure = classifyIdentificationSaveError(error);
    console.error("patient_identification_save_failed", {
      triageId,
      category: failure.category,
      errorName: failure.name,
      ...(failure.code ? { errorCode: failure.code } : {}),
    });

    return { message: "Não foi possível salvar a identificação. Tente novamente." };
  }
  redirect("/paciente/triagem/consentimento");
}

export async function acceptConsentAction(_previous: IntakeActionState, formData: FormData): Promise<IntakeActionState> {
  const triageId = await currentTriageId();
  if (!triageId) return { message: "Inicie uma nova triagem." };

  try {
    const result = await patientIntake.acceptConsent(triageId, { accepted: formData.get("accepted") });
    if (!result.success) return { errors: result.errors };
  } catch {
    return { message: "Não foi possível registrar o consentimento. Tente novamente." };
  }
  redirect("/paciente/triagem/anamnese");
}

export async function completeAnamnesisAction(_previous: IntakeActionState, formData: FormData): Promise<IntakeActionState> {
  const triageId = await currentTriageId();
  if (!triageId) return { message: "Inicie uma nova triagem." };

  const alertAnswers = Object.fromEntries(demoAnamnesis.alertQuestions.map((question) => [question.key, formData.get(question.key)]));
  try {
    const result = await patientIntake.completeAnamnesis(triageId, {
      mainComplaint: formData.get("mainComplaint"),
      additionalDescription: formData.get("additionalDescription") || undefined,
      subjectiveIntensity: formData.get("subjectiveIntensity"),
      approximateDuration: formData.get("approximateDuration"),
      declaredAllergies: formData.get("declaredAllergies") || undefined,
      declaredMedications: formData.get("declaredMedications") || undefined,
      declaredPreexistingConditions: formData.get("declaredPreexistingConditions") || undefined,
      alertAnswers,
    });
    if (!result.success) return { errors: result.errors };
  } catch {
    return { message: "Não foi possível salvar as informações de saúde. Tente novamente." };
  }
  redirect("/paciente/triagem/sinais-vitais");
}

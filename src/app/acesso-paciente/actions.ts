"use server";

import { redirect } from "next/navigation";

import { authenticatePatientAccess } from "@/server/security/patient-access-session";

export type PatientAccessState = { message?: string };

export async function patientAccessAction(_state: PatientAccessState, formData: FormData): Promise<PatientAccessState> {
  const credential = formData.get("credential");
  if (typeof credential !== "string" || !(await authenticatePatientAccess(credential))) return { message: "Credencial inválida." };
  redirect("/paciente");
}

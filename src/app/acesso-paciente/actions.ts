"use server";

import { redirect } from "next/navigation";

import { authenticatePatientAccess } from "@/server/security/patient-access-session";
import { consumeRequestRateLimit } from "@/server/security/request-rate-limit";

export type PatientAccessState = { message?: string };

export async function patientAccessAction(_state: PatientAccessState, formData: FormData): Promise<PatientAccessState> {
  const credential = formData.get("credential");
  if (typeof credential !== "string") return { message: "Credencial inválida." };
  try {
    const limit = await consumeRequestRateLimit("patient-login", { limit: 5, windowMs: 15 * 60_000 });
    if (!limit.allowed && limit.reason !== "storage-missing") return { message: limit.reason === "limited" ? "Muitas tentativas. Aguarde antes de tentar novamente." : "O acesso está temporariamente indisponível. Contate o administrador." };
    if (!(await authenticatePatientAccess(credential))) return { message: "Credencial inválida." };
  } catch {
    return { message: "O acesso está temporariamente indisponível. Contate o administrador." };
  }
  redirect("/paciente");
}

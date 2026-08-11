"use server";

import { redirect } from "next/navigation";
import { authenticateDemoNurse } from "@/server/security/nursing-session";

export type NursingLoginState = { message?: string };
export async function nursingLoginAction(_state: NursingLoginState, formData: FormData): Promise<NursingLoginState> {
  const credential = formData.get("credential");
  if (typeof credential !== "string" || !(await authenticateDemoNurse(credential))) return { message: "Credencial inválida." };
  redirect("/enfermagem");
}

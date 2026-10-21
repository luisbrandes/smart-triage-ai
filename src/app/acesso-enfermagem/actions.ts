"use server";

import { redirect } from "next/navigation";
import { authenticateDemoNurse, clearNursingSession } from "@/server/security/nursing-session";
import { consumeRequestRateLimit } from "@/server/security/request-rate-limit";

export type NursingLoginState = { message?: string };
export async function nursingLoginAction(_state: NursingLoginState, formData: FormData): Promise<NursingLoginState> {
  const credential = formData.get("credential");
  if (typeof credential !== "string") return { message: "Credencial inválida." };
  try {
    const limit = await consumeRequestRateLimit("nurse-login", { limit: 5, windowMs: 15 * 60_000 });
    if (!limit.allowed) return { message: limit.reason === "limited" ? "Muitas tentativas. Aguarde antes de tentar novamente." : "O acesso está temporariamente indisponível. Contate o administrador." };
    if (!(await authenticateDemoNurse(credential))) return { message: "Credencial inválida." };
  } catch {
    return { message: "O acesso está temporariamente indisponível. Contate o administrador." };
  }
  redirect("/enfermagem");
}

export async function nursingLogoutAction(): Promise<never> {
  await clearNursingSession();
  redirect("/acesso-enfermagem");
}

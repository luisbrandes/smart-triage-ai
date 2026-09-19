"use server";

import { redirect } from "next/navigation";

import { getDemoTriageId } from "@/server/demo-triage-session";
import { vitalSigns } from "@/server/vital-signs";

export type PhysicalCollectionActionState = { message?: string };

export async function acceptPhysicalDeviceCollectionAction(_previous: PhysicalCollectionActionState, formData: FormData): Promise<PhysicalCollectionActionState> {
  void _previous;
  const triageId = await getDemoTriageId();
  if (!triageId) return { message: "N\u00e3o foi poss\u00edvel localizar seu atendimento. Inicie novamente." };
  try {
    await vitalSigns.acceptPhysicalCollection(triageId, {
      deviceCollectionSessionId: formData.get("deviceCollectionSessionId"),
      readingId: formData.get("readingId"),
    });
  } catch {
    return { message: "N\u00e3o foi poss\u00edvel confirmar esta coleta. Verifique o equipamento e tente novamente." };
  }
  redirect("/paciente/triagem/analise");
}

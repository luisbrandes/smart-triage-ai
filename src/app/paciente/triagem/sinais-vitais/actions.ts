"use server";

import { redirect } from "next/navigation";

import { getDemoTriageId } from "@/server/demo-triage-session";
import { vitalSigns } from "@/server/vital-signs";

export type VitalSignsActionState = { message?: string };

export async function collectManualAction(_state: VitalSignsActionState, formData: FormData): Promise<VitalSignsActionState> {
  void _state;
  const triageId = await getDemoTriageId();
  if (!triageId) return { message: "Triagem não encontrada. Inicie um novo atendimento." };
  try {
    const result = await vitalSigns.collectManual(triageId, { heartRate: formData.get("heartRate"), spo2: formData.get("spo2") });
    if (!result.success) return { message: result.message };
  } catch { return { message: "Não foi possível registrar a coleta manual." }; }
  redirect("/paciente/triagem/sinais-vitais");
}

export async function collectSimulatedAction(_state: VitalSignsActionState, formData: FormData): Promise<VitalSignsActionState> {
  void _state;
  const triageId = await getDemoTriageId();
  if (!triageId) return { message: "Triagem não encontrada. Inicie um novo atendimento." };
  try { await vitalSigns.collectSimulated(triageId, formData.get("scenario")); } catch { return { message: "Não foi possível executar a simulação." }; }
  redirect("/paciente/triagem/sinais-vitais");
}

export async function completeVitalSignsAction(): Promise<never> {
  const triageId = await getDemoTriageId();
  if (!triageId) redirect("/paciente");
  await vitalSigns.complete(triageId);
  redirect("/paciente/triagem/concluida");
}

export async function prepareFinalAnalysisAction(): Promise<never> {
  const triageId = await getDemoTriageId();
  if (!triageId) redirect("/paciente");
  const flow = await vitalSigns.getFlow(triageId);
  if (!flow.canConfirm) redirect("/paciente/triagem/sinais-vitais");
  redirect("/paciente/triagem/analise");
}

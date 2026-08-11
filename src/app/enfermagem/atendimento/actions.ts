"use server";

import { revalidatePath } from "next/cache";

import type { NursingMutationResult } from "@/server/application/nursing/nursing-mutation-types";
import { NursingMutationConflictError } from "@/server/application/nursing/nursing-mutation-errors";
import { nursing } from "@/server/nursing";
import { getNursingSession } from "@/server/security/nursing-session";

export type CareActionState = NursingMutationResult | { success: false; message: string };
const initialFailure = { success: false as const, message: "Sessão profissional ausente ou expirada." };

async function actor() { return (await getNursingSession())?.actorReference ?? null; }
async function run(operation: (actorReference: string) => Promise<NursingMutationResult>): Promise<CareActionState> {
  const actorReference = await actor();
  if (!actorReference) return initialFailure;
  try { const result = await operation(actorReference); revalidatePath("/enfermagem"); revalidatePath("/enfermagem/atendimento"); return result; }
  catch (error: unknown) { return { success: false, message: error instanceof NursingMutationConflictError ? error.message : "Não foi possível concluir a ação. Atualize a tela e tente novamente." }; }
}

export async function callNextAction(_state: CareActionState): Promise<CareActionState> { void _state; return run((reference) => nursing.callNext(reference)); }
export async function startCareAction(triageId: string, _state: CareActionState): Promise<CareActionState> { void _state; return run((reference) => nursing.startCare(triageId, reference)); }
export async function completeCareAction(triageId: string, _state: CareActionState): Promise<CareActionState> { void _state; return run((reference) => nursing.completeCare(triageId, reference)); }

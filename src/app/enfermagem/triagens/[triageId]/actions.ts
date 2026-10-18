"use server";

import { revalidatePath } from "next/cache";

import { NursingMutationConflictError } from "@/server/application/nursing/nursing-mutation-errors";
import type { NursingMutationResult } from "@/server/application/nursing/nursing-mutation-types";
import { nursing } from "@/server/nursing";
import { aiSuggestion } from "@/server/ai-suggestion";
import { getNursingSession } from "@/server/security/nursing-session";
import { logServerOperation } from "@/server/observability/server-logger";
import { randomUUID } from "node:crypto";

export type NursingActionState = NursingMutationResult | { success: false; message: string };
const validId = (id: string) => /^[0-9a-f-]{36}$/i.test(id);

async function execute(triageId: string, operation: (actor: string) => Promise<NursingMutationResult>): Promise<NursingActionState> {
  if (!validId(triageId)) return { success: false, message: "Triagem inválida." };
  const session = await getNursingSession();
  if (!session) return { success: false, message: "Sessão profissional ausente ou expirada." };
  const correlationId = randomUUID();
  const startedAt = Date.now();
  try {
    const result = await operation(session.actorReference);
    logServerOperation({ operation: "NURSING_MUTATION", correlationId, actorType: "NURSE", entity: "Triage", result: result.success ? "SUCCESS" : "FAILURE", durationMs: Date.now() - startedAt });
    if (result.success) { revalidatePath("/enfermagem"); revalidatePath("/enfermagem/atendimento"); revalidatePath(`/enfermagem/triagens/${triageId}`); }
    return result;
  } catch (error: unknown) {
    if (error instanceof NursingMutationConflictError) { logServerOperation({ operation: "NURSING_MUTATION", correlationId, actorType: "NURSE", entity: "Triage", result: "CONFLICT", errorCode: "STATE_CONFLICT", durationMs: Date.now() - startedAt }); return { success: false, message: error.message }; }
    logServerOperation({ operation: "NURSING_MUTATION", correlationId, actorType: "NURSE", entity: "Triage", result: "FAILURE", errorCode: "UNEXPECTED", durationMs: Date.now() - startedAt });
    return { success: false, message: "Não foi possível concluir a ação. Atualize a página e tente novamente." };
  }
}

export async function confirmClassificationAction(triageId: string, _state: NursingActionState): Promise<NursingActionState> {
  void _state;
  return execute(triageId, (actor) => nursing.confirm(triageId, actor));
}

export async function reclassifyAction(triageId: string, _state: NursingActionState, formData: FormData): Promise<NursingActionState> {
  void _state;
  return execute(triageId, (actor) => nursing.reclassify(triageId, { priority: formData.get("priority"), justification: formData.get("justification") }, actor));
}

export async function requestRecollectionAction(triageId: string, _state: NursingActionState, formData: FormData): Promise<NursingActionState> {
  void _state;
  return execute(triageId, (actor) => nursing.requestRecollection(triageId, { reason: formData.get("reason") }, actor));
}

export async function referToCareAction(triageId: string, _state: NursingActionState, formData: FormData): Promise<NursingActionState> {
  void _state;
  return execute(triageId, (actor) => nursing.refer(triageId, { destination: formData.get("destination"), notes: formData.get("notes") }, actor));
}

export type AiSuggestionActionState = { success: boolean; message: string };

export async function generateAiSuggestionAction(triageId: string, _state: AiSuggestionActionState): Promise<AiSuggestionActionState> {
  void _state;
  if (!validId(triageId)) return { success: false, message: "Triagem inválida." };
  const session = await getNursingSession();
  if (!session) return { success: false, message: "Sessão profissional ausente ou expirada." };
  try {
    const result = await aiSuggestion.generate(triageId, session.actorReference);
    if (result === "SAVED") {
      revalidatePath(`/enfermagem/triagens/${triageId}`);
      return { success: true, message: "Sugestão gerada e salva. Revise o conteúdo antes de decidir." };
    }
    if (result === "ALREADY_EXISTS") return { success: true, message: "A sugestão desta análise já foi gerada. Atualize a página para consultá-la." };
    if (result === "NOT_CONFIGURED") return { success: false, message: "A sugestão da IA não está configurada neste ambiente." };
    if (result === "INSUFFICIENT_DATA") return { success: false, message: "Ainda não há análise final e sinais vitais aceitos suficientes para solicitar a sugestão." };
    if (result === "PERSISTENCE_ERROR") return { success: false, message: "A sugestão foi processada, mas não pôde ser salva. Tente novamente." };
    return { success: false, message: "A IA não respondeu corretamente. Tente novamente mais tarde." };
  } catch {
    return { success: false, message: "Não foi possível gerar a sugestão agora. A decisão profissional continua disponível." };
  }
}

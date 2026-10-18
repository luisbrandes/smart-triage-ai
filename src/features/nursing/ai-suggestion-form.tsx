"use client";

import { useActionState } from "react";

import { generateAiSuggestionAction, type AiSuggestionActionState } from "@/app/enfermagem/triagens/[triageId]/actions";

const initialState: AiSuggestionActionState = { success: false, message: "" };

export function AiSuggestionForm({ triageId }: { triageId: string }) {
  const [state, action, pending] = useActionState(generateAiSuggestionAction.bind(null, triageId), initialState);
  return <form action={action} className="mt-4">
    <p className="mb-3 text-sm text-text-secondary">Ao solicitar, idade, queixa, alertas e sinais da coleta aceita são enviados ao Groq. Use somente dados fictícios nesta demonstração.</p>
    <button className="min-h-11 rounded-md border border-primary px-4 font-semibold text-primary disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? "Gerando sugestão…" : "Solicitar sugestão da IA"}</button>
    {state.message && <p className={`mt-3 rounded-md border p-3 text-sm ${state.success ? "border-success/20 bg-success/10 text-success" : "border-danger/20 bg-danger/10 text-danger"}`} role="status">{state.message}</p>}
  </form>;
}

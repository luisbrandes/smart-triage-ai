"use client";

import { useActionState } from "react";

import { generateAiSuggestionAction, type AiSuggestionActionState } from "@/app/enfermagem/triagens/[triageId]/actions";

const initialState: AiSuggestionActionState = { success: false, message: "" };

export function AiSuggestionForm({ triageId }: { triageId: string }) {
  const [state, action, pending] = useActionState(generateAiSuggestionAction.bind(null, triageId), initialState);
  return <form action={action} className="mt-4">
    <p className="mb-3 text-sm text-text-secondary">Analise os dados da triagem com apoio da IA. Use somente dados fictícios.</p>
    <details className="mb-3 text-sm text-text-secondary"><summary className="min-h-11 cursor-pointer py-3 font-medium">Quais dados serão enviados?</summary><p className="pb-3 leading-6">Idade, sexo, queixa, intensidade, duração, alertas, sinais vitais e recomendação do sistema serão enviados ao Groq. Campos ausentes serão indicados como não informados.</p></details>
    <button className="min-h-11 rounded-md border border-primary px-4 font-semibold text-primary disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? "Gerando sugestão…" : "Solicitar sugestão da IA"}</button>
    {state.message && <p className={`mt-3 rounded-md border p-3 text-sm ${state.success ? "border-success/20 bg-success/10 text-success" : "border-danger/20 bg-danger/10 text-danger"}`} role="status">{state.message}</p>}
  </form>;
}

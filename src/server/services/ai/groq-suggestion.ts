import "server-only";

import { z } from "zod";

import type { AiSuggestionInput, AiSuggestionResult } from "@/server/application/ai-suggestion/ai-suggestion-types";

export const GROQ_MODEL = "llama-3.3-70b-versatile";
export const AI_PROMPT_VERSION = "DEMO-AI-SUGGESTION-001";

const suggestionSchema = z.object({
  priority: z.enum(["RED", "YELLOW", "GREEN", "BLUE"]),
  attention: z.enum(["HIGH", "MODERATE", "LOW"]),
  conclusion: z.string().trim().min(10).max(500),
  factors: z.array(z.string().trim().min(1).max(100)).min(1).max(6),
}).strict();

export async function requestGroqSuggestion(input: AiSuggestionInput, fetcher: typeof fetch = fetch): Promise<AiSuggestionResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (process.env.APP_MODE !== "demo" || !apiKey) return null;
  try {
    const response = await fetcher("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6_000),
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0,
        max_completion_tokens: 450,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "Você é um apoio experimental de triagem, não um sistema de diagnóstico. Use apenas os dados fornecidos. Se os dados forem insuficientes, deixe isso explícito em conclusion e factors. Devolva JSON com priority (RED/YELLOW/GREEN/BLUE), attention (HIGH/MODERATE/LOW), conclusion (frase breve sem diagnóstico ou doença afirmada) e factors (até 6 fatores observados). Não invente limiares clínicos, protocolos, dados ausentes ou confiança numérica. A avaliação e decisão final pertencem à enfermagem." },
          { role: "user", content: JSON.stringify(input) },
        ],
      }),
    });
    if (!response.ok) return null;
    const envelope: unknown = await response.json();
    const content = z.object({ choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1) }).safeParse(envelope);
    if (!content.success) return null;
    const parsed = suggestionSchema.safeParse(JSON.parse(content.data.choices[0].message.content));
    return parsed.success ? parsed.data : null;
  } catch {
    // Nunca registre prompt, resposta do provedor ou credencial em logs.
    return null;
  }
}

import "server-only";

import { z } from "zod";

import type { AiSuggestionInput, AiSuggestionResult } from "@/server/application/ai-suggestion/ai-suggestion-types";
import { logServerOperation } from "@/server/observability/server-logger";

export const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
export const AI_PROMPT_VERSION = "DEMO-AI-SUGGESTION-001";

const suggestionSchema = z.object({
  priority: z.enum(["RED", "YELLOW", "GREEN", "BLUE"]),
  attention: z.enum(["HIGH", "MODERATE", "LOW"]),
  conclusion: z.string().trim().min(10).max(500),
  factors: z.array(z.string().trim().min(1).max(100)).min(1).max(6),
}).strict();

const responseSchema = {
  type: "object",
  properties: {
    priority: { type: "string", enum: ["RED", "YELLOW", "GREEN", "BLUE"] },
    attention: { type: "string", enum: ["HIGH", "MODERATE", "LOW"] },
    conclusion: { type: "string" },
    factors: { type: "array", items: { type: "string" } },
  },
  required: ["priority", "attention", "conclusion", "factors"],
  additionalProperties: false,
} as const;

function logFailure(triageId: string | undefined, stage: string, errorCode: string, state?: string): void {
  logServerOperation({ operation: "ai-suggestion", correlationId: crypto.randomUUID(), actorType: "SYSTEM", entity: `AiSuggestion:${triageId ?? "unknown"}`, result: "FAILURE", errorCode, state: `${stage}${state ? `:${state}` : ""}` });
}

export async function requestGroqSuggestion(input: AiSuggestionInput, fetcher: typeof fetch = fetch, triageId?: string): Promise<AiSuggestionResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (process.env.APP_MODE !== "demo") { logFailure(triageId, "configuration", "APP_MODE_NOT_DEMO"); return null; }
  if (!apiKey) { logFailure(triageId, "configuration", "GROQ_API_KEY_MISSING"); return null; }
  try {
    const response = await fetcher("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6_000),
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0,
        max_completion_tokens: 450,
        response_format: { type: "json_schema", json_schema: { name: "triage_suggestion", strict: true, schema: responseSchema } },
        messages: [
          { role: "system", content: "Você é um apoio experimental de triagem, não um sistema de diagnóstico. Use apenas os dados fornecidos. Se os dados forem insuficientes, deixe isso explícito em conclusion e factors. Devolva JSON com priority (RED/YELLOW/GREEN/BLUE), attention (HIGH/MODERATE/LOW), conclusion (frase breve sem diagnóstico ou doença afirmada) e factors (até 6 fatores observados). Não invente limiares clínicos, protocolos, dados ausentes ou confiança numérica. A avaliação e decisão final pertencem à enfermagem." },
          { role: "user", content: JSON.stringify(input) },
        ],
      }),
    });
    if (!response.ok) {
      let providerCode = `HTTP_${response.status}`;
      try {
        const errorBody: unknown = await response.json();
        if (typeof errorBody === "object" && errorBody !== null && "error" in errorBody && typeof errorBody.error === "object" && errorBody.error !== null && "code" in errorBody.error && typeof errorBody.error.code === "string") providerCode = errorBody.error.code;
        else if (typeof errorBody === "object" && errorBody !== null && "error" in errorBody && typeof errorBody.error === "object" && errorBody.error !== null && "type" in errorBody.error && typeof errorBody.error.type === "string") providerCode = errorBody.error.type;
      } catch { /* corpo de erro não é necessário para a interface */ }
      logFailure(triageId, "provider", providerCode, String(response.status));
      return null;
    }
    const envelope: unknown = await response.json();
    const content = z.object({ choices: z.array(z.object({ message: z.object({ content: z.string() }) })).min(1) }).safeParse(envelope);
    if (!content.success) { logFailure(triageId, "response", "ENVELOPE_INVALID"); return null; }
    let raw: unknown;
    try { raw = JSON.parse(content.data.choices[0].message.content); } catch { logFailure(triageId, "response", "JSON_INVALID"); return null; }
    const parsed = suggestionSchema.safeParse(raw);
    if (!parsed.success) { logFailure(triageId, "response", "SCHEMA_INVALID"); return null; }
    return parsed.data;
  } catch (error) {
    logFailure(triageId, "provider", error instanceof Error && error.name === "TimeoutError" ? "TIMEOUT" : "NETWORK_ERROR");
    return null;
  }
}

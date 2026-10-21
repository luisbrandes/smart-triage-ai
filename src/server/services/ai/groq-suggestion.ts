import "server-only";

import { z } from "zod";

import type { AiEvidenceItem, AiSuggestionInput, AiSuggestionResult } from "@/server/application/ai-suggestion/ai-suggestion-types";
import { logServerOperation } from "@/server/observability/server-logger";

export const GROQ_MODEL = process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
export const AI_PROMPT_VERSION = "DEMO-AI-SUGGESTION-003";
const MIN_EVIDENCE_ITEMS = 1;
const MAX_EVIDENCE_ITEMS = 6;

const modelSelectionSchema = z.object({
  suggestion: z.enum(["RED", "YELLOW", "GREEN", "BLUE"]),
  attention: z.enum(["HIGH", "MODERATE", "LOW"]),
  evidenceKeys: z.array(z.string().min(1).max(40)).min(MIN_EVIDENCE_ITEMS).max(MAX_EVIDENCE_ITEMS),
}).strict();

const limitations = [
  "Sugestão experimental; não é diagnóstico nem protocolo clínico validado.",
  "A classificação oficial, a prioridade da fila e a decisão final permanecem sob responsabilidade da enfermagem.",
];

function displayValue(value: string | number | null): string {
  return value === null || value === "" ? "Não informado" : String(value);
}

export function dataConsideredForSuggestion(input: AiSuggestionInput): AiEvidenceItem[] {
  return [
    { key: "ageYears", label: "Idade", value: input.ageYears === null ? "Não informada" : `${input.ageYears} anos` },
    { key: "sex", label: "Sexo", value: displayValue(input.sex) },
    { key: "mainComplaint", label: "Queixa principal", value: input.mainComplaint },
    { key: "subjectiveIntensity", label: "Intensidade relatada", value: displayValue(input.subjectiveIntensity) },
    { key: "approximateDuration", label: "Duração relatada", value: displayValue(input.approximateDuration) },
    { key: "reportedAlerts", label: "Alertas da anamnese", value: input.reportedAlerts.length ? input.reportedAlerts.join("; ") : "Nenhum indicativo positivo marcado" },
    { key: "bpm", label: "Frequência cardíaca", value: `${input.bpm} bpm` },
    { key: "spo2", label: "SpO₂", value: `${input.spo2}%` },
    { key: "temperature", label: "Temperatura", value: input.temperature === null ? "Não informada" : `${input.temperature} °C` },
    { key: "weight", label: "Peso", value: input.weight === null ? "Não informado" : `${input.weight} kg` },
    { key: "height", label: "Altura", value: input.height === null ? "Não informada" : `${input.height} m` },
    { key: "systemPriority", label: "Recomendação atual do sistema", value: input.systemPriority },
  ];
}

function responseSchema(evidenceKeys: string[]) {
  return {
    type: "object",
    properties: {
      suggestion: { type: "string", enum: ["RED", "YELLOW", "GREEN", "BLUE"] },
      attention: { type: "string", enum: ["HIGH", "MODERATE", "LOW"] },
      evidenceKeys: { type: "array", minItems: MIN_EVIDENCE_ITEMS, maxItems: MAX_EVIDENCE_ITEMS, items: { type: "string", enum: evidenceKeys } },
    },
    required: ["suggestion", "attention", "evidenceKeys"],
    additionalProperties: false,
  } as const;
}

function priorityLabel(priority: AiSuggestionResult["suggestion"]): string {
  return { RED: "vermelha", YELLOW: "amarela", GREEN: "verde", BLUE: "azul" }[priority];
}

function attentionLabel(attention: AiSuggestionResult["attention"]): string {
  return { HIGH: "alta", MODERATE: "moderada", LOW: "baixa" }[attention];
}

function buildResult(input: AiSuggestionInput, selection: z.infer<typeof modelSelectionSchema>): AiSuggestionResult | null {
  const dataConsidered = dataConsideredForSuggestion(input);
  const allowedKeys = new Set(dataConsidered.map((item) => item.key));
  if (new Set(selection.evidenceKeys).size !== selection.evidenceKeys.length || selection.evidenceKeys.some((key) => !allowedKeys.has(key))) return null;
  const indicators = selection.evidenceKeys.map((key) => dataConsidered.find((item) => item.key === key)!);
  const labels = indicators.map((item) => item.label);
  const factors = labels.length > 1 ? `${labels.slice(0, -1).join(", ")} e ${labels.at(-1)}` : labels[0];
  return {
    suggestion: selection.suggestion,
    attention: selection.attention,
    summary: `Sugestão ${priorityLabel(selection.suggestion)} com nível de atenção ${attentionLabel(selection.attention)}.`,
    indicators,
    explanation: `O modelo selecionou ${factors} entre os dados enviados como fatores associados à sugestão. Essa associação resume a resposta do modelo e não representa uma regra clínica validada.`,
    dataConsidered,
    limitations,
  };
}

function logFailure(triageId: string | undefined, stage: string, errorCode: string, state?: string): void {
  logServerOperation({ operation: "ai-suggestion", correlationId: crypto.randomUUID(), actorType: "SYSTEM", entity: `AiSuggestion:${triageId ?? "unknown"}`, result: "FAILURE", errorCode, state: `${stage}${state ? `:${state}` : ""}` });
}

function safeNetworkErrorCode(error: unknown): string {
  let current: unknown = error;
  for (let depth = 0; depth < 4; depth += 1) {
    if (!current || typeof current !== "object") break;
    const value = current as { code?: unknown; cause?: unknown };
    if (typeof value.code === "string" && /^[A-Z0-9_]{2,48}$/.test(value.code)) return `NETWORK_${value.code}`;
    current = value.cause;
  }
  return "NETWORK_ERROR";
}

export async function requestGroqSuggestion(input: AiSuggestionInput, fetcher: typeof fetch = fetch, triageId?: string): Promise<AiSuggestionResult | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (process.env.APP_MODE !== "demo") { logFailure(triageId, "configuration", "APP_MODE_NOT_DEMO"); return null; }
  if (!apiKey) { logFailure(triageId, "configuration", "GROQ_API_KEY_MISSING"); return null; }
  const dataConsidered = dataConsideredForSuggestion(input);
  try {
    const response = await fetcher("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      signal: AbortSignal.timeout(6_000),
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0,
        max_completion_tokens: 450,
        response_format: { type: "json_schema", json_schema: { name: "triage_suggestion", strict: true, schema: responseSchema(dataConsidered.map((item) => item.key)) } },
        messages: [
          { role: "system", content: `You support experimental triage. Return JSON only with suggestion, attention, and evidenceKeys. Select ${MIN_EVIDENCE_ITEMS} to ${MAX_EVIDENCE_ITEMS} distinct evidenceKeys, only from the supplied dataConsidered list. Do not produce free text, diagnoses, thresholds, symptoms, values, or missing data. The nurse owns the final classification and decision.` },
          { role: "user", content: JSON.stringify({ dataConsidered }) },
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
    const parsed = modelSelectionSchema.safeParse(raw);
    if (!parsed.success) {
      // Log categories only; never include the provider response or input values.
      const candidate = raw as { evidenceKeys?: unknown } | null;
      const evidence = candidate && typeof candidate === "object" ? candidate.evidenceKeys : undefined;
      const detail = Array.isArray(evidence) && evidence.length > MAX_EVIDENCE_ITEMS ? "EVIDENCE_TOO_MANY"
        : Array.isArray(evidence) && evidence.length < MIN_EVIDENCE_ITEMS ? "EVIDENCE_EMPTY" : "STRUCTURE_MISMATCH";
      logFailure(triageId, "response", "SCHEMA_INVALID", detail);
      return null;
    }
    const result = buildResult(input, parsed.data);
    if (!result) { logFailure(triageId, "response", "EVIDENCE_INVALID"); return null; }
    return result;
  } catch (error) {
    logFailure(triageId, "provider", error instanceof Error && error.name === "TimeoutError" ? "TIMEOUT" : safeNetworkErrorCode(error));
    return null;
  }
}

import { afterEach, describe, expect, it, vi } from "vitest";

import type { AiSuggestionInput } from "@/server/application/ai-suggestion/ai-suggestion-types";
import { requestGroqSuggestion } from "@/server/services/ai/groq-suggestion";

const fictitiousInput: AiSuggestionInput = {
  ageYears: 42, sex: null, mainComplaint: "Queixa fictícia para teste", subjectiveIntensity: 5,
  approximateDuration: null, reportedAlerts: [], bpm: 78, spo2: 98, temperature: 36.7,
  weight: null, height: null, systemPriority: "GREEN",
};

afterEach(() => vi.unstubAllEnvs());

describe("sugestão experimental via Groq", () => {
  it("envia somente o conjunto mínimo e valida resposta estruturada", async () => {
    vi.stubEnv("APP_MODE", "demo");
    vi.stubEnv("GROQ_API_KEY", "fake-test-key");
    const fetcher = vi.fn(async (_url: unknown, options: RequestInit) => {
      const body = JSON.parse(String(options.body));
      expect(body.messages[1].content).toContain("Queixa fictícia");
      expect(body.messages[1].content).not.toContain("patientId");
      expect(options.headers).toMatchObject({ Authorization: "Bearer fake-test-key" });
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ priority: "YELLOW", attention: "MODERATE", conclusion: "Dados fictícios justificam avaliação profissional.", factors: ["SpO2", "Sintomas"] }) } }] }), { status: 200 });
    });
    const result = await requestGroqSuggestion(fictitiousInput, fetcher as typeof fetch);
    expect(result?.priority).toBe("YELLOW");
    expect(result?.factors).toEqual(["SpO2", "Sintomas"]);
  });

  it("não chama o provedor sem chave ou fora do modo demo", async () => {
    vi.stubEnv("APP_MODE", "production");
    vi.stubEnv("GROQ_API_KEY", "fake-test-key");
    const fetcher = vi.fn();
    expect(await requestGroqSuggestion(fictitiousInput, fetcher)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("não bloqueia o fluxo diante de erro ou saída inválida", async () => {
    vi.stubEnv("APP_MODE", "demo");
    vi.stubEnv("GROQ_API_KEY", "fake-test-key");
    expect(await requestGroqSuggestion(fictitiousInput, vi.fn(async () => new Response("", { status: 429 })))).toBeNull();
    expect(await requestGroqSuggestion(fictitiousInput, vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"priority":"BLUE"}' } }] }), { status: 200 })))).toBeNull();
  });
});

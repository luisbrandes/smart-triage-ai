import { afterEach, describe, expect, it, vi } from "vitest";

import type { AiSuggestionInput } from "@/server/application/ai-suggestion/ai-suggestion-types";
import { dataConsideredForSuggestion, requestGroqSuggestion } from "@/server/services/ai/groq-suggestion";
import { logServerOperation } from "@/server/observability/server-logger";

vi.mock("@/server/observability/server-logger", () => ({ logServerOperation: vi.fn() }));

const fictitiousInput: AiSuggestionInput = {
  ageYears: 42, sex: null, mainComplaint: "Queixa fictícia para teste", subjectiveIntensity: 5,
  approximateDuration: null, reportedAlerts: [], bpm: 78, spo2: 98, temperature: 36.7,
  weight: null, height: null, systemPriority: "GREEN",
};

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("sugestão experimental via Groq", () => {
  it("envia dados estruturados e valida a resposta sem fatos livres", async () => {
    vi.stubEnv("APP_MODE", "demo");
    vi.stubEnv("GROQ_API_KEY", "fake-test-key");
    const fetcher = vi.fn(async (_url: unknown, options: RequestInit) => {
      const body = JSON.parse(String(options.body));
      const promptData = JSON.parse(body.messages[1].content);
      expect(promptData.dataConsidered).toContainEqual({ key: "mainComplaint", label: "Queixa principal", value: "Queixa fictícia para teste" });
      expect(JSON.stringify(promptData)).not.toContain("patientId");
      expect(body.response_format.json_schema.schema.properties.evidenceKeys.items.enum).toContain("spo2");
      expect(body.response_format.json_schema.strict).toBe(true);
      expect(body.response_format.json_schema.schema.properties.evidenceKeys).toMatchObject({ minItems: 1, maxItems: 6 });
      expect(options.headers).toMatchObject({ Authorization: "Bearer fake-test-key" });
      return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ suggestion: "YELLOW", attention: "MODERATE", evidenceKeys: ["spo2", "mainComplaint"] }) } }] }), { status: 200 });
    });
    const result = await requestGroqSuggestion(fictitiousInput, fetcher as typeof fetch);
    expect(result?.suggestion).toBe("YELLOW");
    expect(result?.indicators).toEqual([
      { key: "spo2", label: "SpO₂", value: "98%" },
      { key: "mainComplaint", label: "Queixa principal", value: "Queixa fictícia para teste" },
    ]);
    expect(result?.dataConsidered.map(({ key }) => key)).toEqual(expect.arrayContaining(["ageYears", "sex", "mainComplaint", "bpm", "spo2", "temperature", "weight", "height", "systemPriority"]));
    expect(result?.explanation).toContain("SpO₂");
    expect(result?.summary).toContain("amarela");
    expect(result?.limitations.length).toBeGreaterThan(0);
  });

  it("rejects evidence the backend did not send", async () => {
    vi.stubEnv("APP_MODE", "demo");
    vi.stubEnv("GROQ_API_KEY", "fake-test-key");
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ suggestion: "YELLOW", attention: "MODERATE", evidenceKeys: ["diagnosis"] }) } }] }), { status: 200 }));
    await expect(requestGroqSuggestion(fictitiousInput, fetcher as typeof fetch)).resolves.toBeNull();
  });

  it.each([1, 6])("accepts %i selected fields at the contract boundaries", async (count) => {
    vi.stubEnv("APP_MODE", "demo");
    vi.stubEnv("GROQ_API_KEY", "fake-test-key");
    const evidenceKeys = dataConsideredForSuggestion(fictitiousInput).slice(0, count).map((item) => item.key);
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ suggestion: "GREEN", attention: "LOW", evidenceKeys }) } }] })));
    expect((await requestGroqSuggestion(fictitiousInput, fetcher as typeof fetch))?.indicators).toHaveLength(count);
  });

  it.each([0, 7])("rejects %i selected fields outside the same contract boundaries", async (count) => {
    vi.stubEnv("APP_MODE", "demo");
    vi.stubEnv("GROQ_API_KEY", "fake-test-key");
    const evidenceKeys = dataConsideredForSuggestion(fictitiousInput).slice(0, count).map((item) => item.key);
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ suggestion: "GREEN", attention: "LOW", evidenceKeys }) } }] })));
    await expect(requestGroqSuggestion(fictitiousInput, fetcher as typeof fetch)).resolves.toBeNull();
    expect(logServerOperation).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "SCHEMA_INVALID", state: `response:${count === 0 ? "EVIDENCE_EMPTY" : "EVIDENCE_TOO_MANY"}` }));
    expect(JSON.stringify(vi.mocked(logServerOperation).mock.calls)).not.toContain(fictitiousInput.mainComplaint);
  });

  it("rejects duplicate selected keys", async () => {
    vi.stubEnv("APP_MODE", "demo");
    vi.stubEnv("GROQ_API_KEY", "fake-test-key");
    const fetcher = vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify({ suggestion: "GREEN", attention: "LOW", evidenceKeys: ["bpm", "bpm"] }) } }] })));
    await expect(requestGroqSuggestion(fictitiousInput, fetcher as typeof fetch)).resolves.toBeNull();
  });

  it("shows unavailable optional fields as not informed", () => {
    const data = dataConsideredForSuggestion(fictitiousInput);
    expect(data.find(({ key }) => key === "sex")?.value).toBe("Não informado");
    expect(data.find(({ key }) => key === "weight")?.value).toBe("Não informado");
  });

  it("não chama o provedor sem chave ou fora do modo demo", async () => {
    vi.stubEnv("APP_MODE", "production");
    vi.stubEnv("GROQ_API_KEY", "fake-test-key");
    const fetcher = vi.fn();
    expect(await requestGroqSuggestion(fictitiousInput, fetcher)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
    vi.stubEnv("APP_MODE", "demo");
    vi.stubEnv("GROQ_API_KEY", "");
    expect(await requestGroqSuggestion(fictitiousInput, fetcher)).toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("não bloqueia o fluxo diante de erro ou saída inválida", async () => {
    vi.stubEnv("APP_MODE", "demo");
    vi.stubEnv("GROQ_API_KEY", "fake-test-key");
    expect(await requestGroqSuggestion(fictitiousInput, vi.fn(async () => new Response("", { status: 429 })))).toBeNull();
    expect(await requestGroqSuggestion(fictitiousInput, vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: '{"priority":"BLUE"}' } }] }), { status: 200 })))).toBeNull();
    const timeout = Object.assign(new Error("internal timeout detail"), { name: "TimeoutError" });
    expect(await requestGroqSuggestion(fictitiousInput, vi.fn(async () => { throw timeout; }))).toBeNull();
  });
});

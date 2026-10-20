import { describe, expect, it, vi } from "vitest";

const logger = vi.hoisted(() => ({ logServerOperation: vi.fn() }));
vi.mock("@/server/observability/server-logger", () => logger);

import { requestGroqSuggestion } from "@/server/services/ai/groq-suggestion";

describe("diagnóstico sanitizado de rede Groq", () => {
  it("registra o código de conectividade sem mensagem/cause potencialmente sensível", async () => {
    vi.stubEnv("APP_MODE", "demo");
    vi.stubEnv("GROQ_API_KEY", "fake-test-key");
    const input = {
      ageYears: null, sex: null, mainComplaint: "Cenário fictício", subjectiveIntensity: null,
      approximateDuration: null, reportedAlerts: [], bpm: 78, spo2: 98, temperature: null,
      weight: null, height: null, systemPriority: "GREEN" as const,
    };
    const cause = Object.assign(new Error("detalhes privados da conexão"), { code: "EACCES" });
    const error = new TypeError("fetch failed", { cause });
    await expect(requestGroqSuggestion(input, vi.fn(async () => { throw error; }) as typeof fetch)).resolves.toBeNull();
    expect(logger.logServerOperation).toHaveBeenCalledWith(expect.objectContaining({ errorCode: "NETWORK_EACCES" }));
    expect(JSON.stringify(logger.logServerOperation.mock.calls)).not.toContain("detalhes privados");
    vi.unstubAllEnvs();
  });
});

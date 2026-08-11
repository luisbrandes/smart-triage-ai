import { describe, expect, it } from "vitest";
import { finalAnalysisFingerprint } from "@/server/application/vital-signs/final-analysis-fingerprint";

describe("fingerprint contextual da análise final", () => {
  it("é idempotente dentro da mesma sessão", () => { expect(finalAnalysisFingerprint("input", "session-1", 1)).toBe(finalAnalysisFingerprint("input", "session-1", 1)); });
  it("gera nova execução para nova sessão com valores idênticos", () => { expect(finalAnalysisFingerprint("input", "session-1", 1)).not.toBe(finalAnalysisFingerprint("input", "session-2", 2)); });
});

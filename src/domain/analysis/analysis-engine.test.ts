import { describe, expect, it } from "vitest";

import { runDeterministicFinalAnalysis } from "@/domain/analysis/analysis-engine";
import { demoFinalAnalysisRuleSet } from "@/demo/analysis-rules";

const executedAt = new Date("2026-01-15T12:00:00.000Z");
const negativeAlerts = Object.fromEntries(demoFinalAnalysisRuleSet.alertRules.map((rule) => [rule.questionKey, "no"])) as Record<string, "no">;

describe("reanálise demonstrativa com sinais vitais", () => {
  it("usa medições normalizadas e encerra a solicitação de coleta", () => {
    const result = runDeterministicFinalAnalysis({ catalogVersion: "DEMO", subjectiveIntensity: 1, alertAnswers: negativeAlerts, vitalSigns: { heartRate: 82, spo2: 98 } }, demoFinalAnalysisRuleSet, executedAt);
    expect(result.ruleSetVersion).toBe("V0-DEMO-RULESET-002");
    expect(result.requiresVitalSigns).toBe(false);
  });

  it("adiciona justificativa previsível quando marcador técnico fictício é alcançado", () => {
    const result = runDeterministicFinalAnalysis({ catalogVersion: "DEMO", subjectiveIntensity: 1, alertAnswers: negativeAlerts, vitalSigns: { heartRate: 100, spo2: 98 } }, demoFinalAnalysisRuleSet, executedAt);
    expect(result.reasons.map((reason) => reason.code)).toContain("DEMO_HEART_RATE_ATTENTION");
  });
});

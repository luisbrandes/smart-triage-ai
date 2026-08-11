import type { AnalysisEngineResult, DemoAnalysisRuleSet, DemoFinalAnalysisRuleSet, NormalizedAnalysisInput } from "@/domain/analysis/analysis-types";

function evaluateAnamnesis(input: NormalizedAnalysisInput, ruleSet: DemoAnalysisRuleSet, executedAt: Date): AnalysisEngineResult {
  const positiveAlerts = ruleSet.alertRules.filter((rule) => input.alertAnswers[rule.questionKey] === "yes");

  if (positiveAlerts.length > 0) {
    return {
      recommendedPriority: "RED",
      requiresVitalSigns: true,
      reasons: [
        ...positiveAlerts.map((rule) => ({
          code: rule.reasonCode,
          category: "DEMO_ALERT" as const,
          explanation: `Sinal de atenção informado: “${rule.questionLabel}”`,
        })),
        { code: "DEMO_VITALS_FOR_ALERT", category: "DEMO_COLLECTION", explanation: "Coleta de sinais vitais solicitada para complementar a demonstração." },
      ],
      ruleSetVersion: ruleSet.version,
      executedAt,
      status: "COMPLETED",
    };
  }

  if (input.subjectiveIntensity >= ruleSet.highIntensity.minimum) {
    return {
      recommendedPriority: "YELLOW",
      requiresVitalSigns: true,
      reasons: [
        { code: ruleSet.highIntensity.reasonCode, category: "DEMO_INTENSITY", explanation: ruleSet.highIntensity.explanation },
        { code: "DEMO_VITALS_FOR_INTENSITY", category: "DEMO_COLLECTION", explanation: "Coleta de sinais vitais solicitada para complementar a demonstração." },
      ],
      ruleSetVersion: ruleSet.version,
      executedAt,
      status: "COMPLETED",
    };
  }

  if (input.subjectiveIntensity >= ruleSet.intermediateIntensity.minimum) {
    return {
      recommendedPriority: "YELLOW",
      requiresVitalSigns: true,
      reasons: [{ code: ruleSet.intermediateIntensity.reasonCode, category: "DEMO_INTENSITY", explanation: ruleSet.intermediateIntensity.explanation }],
      ruleSetVersion: ruleSet.version,
      executedAt,
      status: "COMPLETED",
    };
  }

  return {
    recommendedPriority: "GREEN",
    requiresVitalSigns: true,
    reasons: [{ code: "DEMO_NO_FACTORS", category: "DEMO_DEFAULT", explanation: "Nenhum sinal adicional de atenção foi identificado nas respostas informadas." }],
    ruleSetVersion: ruleSet.version,
    executedAt,
    status: "COMPLETED",
  };
}

export function runDeterministicFinalAnalysis(input: NormalizedAnalysisInput, ruleSet: DemoFinalAnalysisRuleSet, executedAt: Date): AnalysisEngineResult {
  if (!input.vitalSigns) throw new Error("Medições normalizadas são obrigatórias para a análise final.");
  const anamnesisResult = evaluateAnamnesis(input, ruleSet, executedAt);
  const technicalReasons = [];
  if (input.vitalSigns.heartRate >= ruleSet.technicalDemonstration.heartRateAttentionAt) technicalReasons.push({ code: "DEMO_HEART_RATE_ATTENTION", category: "DEMO_COLLECTION" as const, explanation: "Frequência cardíaca sinalizada para atenção durante a revisão." });
  if (input.vitalSigns.spo2 <= ruleSet.technicalDemonstration.spo2AttentionAtOrBelow) technicalReasons.push({ code: "DEMO_SPO2_ATTENTION", category: "DEMO_COLLECTION" as const, explanation: "Saturação de oxigênio sinalizada para atenção durante a revisão." });
  return {
    ...anamnesisResult,
    recommendedPriority: technicalReasons.length > 0 && anamnesisResult.recommendedPriority === "GREEN" ? "YELLOW" : anamnesisResult.recommendedPriority,
    requiresVitalSigns: false,
    reasons: [...anamnesisResult.reasons, ...technicalReasons],
    ruleSetVersion: ruleSet.version,
  };
}

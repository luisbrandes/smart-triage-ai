/**
 * Regras exclusivamente demonstrativas da V0.
 * Não validadas para uso clínico ou produção.
 */

import type { DemoAnalysisRuleSet, DemoFinalAnalysisRuleSet } from "@/domain/analysis/analysis-types";
import { demoAnamnesis } from "@/demo/anamnesis";

export const demoAnalysisRuleSet = {
  version: "V0-DEMO-RULESET-001",
  description: "Conjunto de critérios para análise assistiva e revisão da enfermagem.",
  alertRules: demoAnamnesis.alertQuestions.map((question) => ({
    questionKey: question.key,
    questionLabel: question.label,
    reasonCode: `DEMO_POSITIVE_${question.key}`,
  })),
  highIntensity: {
    minimum: 7,
    reasonCode: "DEMO_HIGH_SUBJECTIVE_INTENSITY",
    explanation: "Intensidade elevada informada pelo paciente.",
  },
  intermediateIntensity: {
    minimum: 4,
    reasonCode: "DEMO_INTERMEDIATE_SUBJECTIVE_INTENSITY",
    explanation: "Intensidade intermediária informada pelo paciente.",
  },
} as const satisfies DemoAnalysisRuleSet;

export const demoFinalAnalysisRuleSet = {
  ...demoAnalysisRuleSet,
  version: "V0-DEMO-RULESET-002",
  description: "Análise assistiva atualizada com frequência cardíaca e saturação de oxigênio.",
  vitalSignsVersion: "V0-DEMO-VITALS-001",
  technicalDemonstration: { heartRateAttentionAt: 100, spo2AttentionAtOrBelow: 95 },
} as const satisfies DemoFinalAnalysisRuleSet;

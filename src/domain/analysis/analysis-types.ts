export type AnalysisPriority = "GREEN" | "YELLOW" | "RED";

export type NormalizedAnalysisInput = {
  catalogVersion: string;
  subjectiveIntensity: number;
  alertAnswers: Record<string, "yes" | "no">;
  vitalSigns?: { heartRate: number; spo2: number };
};

export type DemoAnalysisRuleSet = {
  version: string;
  description: string;
  alertRules: readonly {
    questionKey: string;
    questionLabel: string;
    reasonCode: string;
  }[];
  highIntensity: {
    minimum: number;
    reasonCode: string;
    explanation: string;
  };
  intermediateIntensity: {
    minimum: number;
    reasonCode: string;
    explanation: string;
  };
};

export type DemoFinalAnalysisRuleSet = DemoAnalysisRuleSet & {
  vitalSignsVersion: string;
  technicalDemonstration: { heartRateAttentionAt: number; spo2AttentionAtOrBelow: number };
};

export type AnalysisReason = {
  code: string;
  category: "DEMO_ALERT" | "DEMO_INTENSITY" | "DEMO_DEFAULT" | "DEMO_COLLECTION";
  explanation: string;
};

export type AnalysisEngineResult = {
  recommendedPriority: AnalysisPriority;
  requiresVitalSigns: boolean;
  reasons: AnalysisReason[];
  ruleSetVersion: string;
  executedAt: Date;
  status: "COMPLETED";
};

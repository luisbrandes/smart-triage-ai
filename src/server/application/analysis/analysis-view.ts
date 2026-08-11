import type { AnalysisPriority } from "@/domain/analysis/analysis-types";

export type AnalysisView = {
  analysisRunId: string;
  recommendedPriority: AnalysisPriority;
  requiresVitalSigns: boolean;
  reasons: { code: string; explanation: string; category: string; displayOrder: number }[];
  ruleSetVersion: string;
  executedAt: Date;
  triageStatus: "AWAITING_NURSE_REVIEW";
};

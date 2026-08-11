import type { AnalysisEngineResult, NormalizedAnalysisInput } from "@/domain/analysis/analysis-types";
import type { AnalysisView } from "@/server/application/analysis/analysis-view";
import type { RecordAttemptInput, VitalSignsFlowView } from "@/server/application/vital-signs/vital-signs-types";

export interface VitalSignsRepository {
  recordAttempt(input: RecordAttemptInput): Promise<VitalSignsFlowView>;
  getFlow(triageId: string): Promise<VitalSignsFlowView>;
  completeAndAnalyze(input: {
    triageId: string;
    ruleSetVersion: string;
    ruleSetDescription: string;
    evaluate: (normalizedInput: NormalizedAnalysisInput) => { fingerprint: string; result: AnalysisEngineResult };
  }): Promise<AnalysisView>;
  findLatestFinalAnalysis(triageId: string): Promise<AnalysisView | null>;
}

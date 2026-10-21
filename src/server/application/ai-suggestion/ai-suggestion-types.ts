export type AiSuggestionInput = {
  ageYears: number | null;
  sex: string | null;
  mainComplaint: string;
  subjectiveIntensity: number | null;
  approximateDuration: string | null;
  reportedAlerts: string[];
  bpm: number;
  spo2: number;
  temperature: number | null;
  weight: number | null;
  height: number | null;
  systemPriority: "RED" | "YELLOW" | "GREEN";
};

export type AiSuggestionResult = {
  suggestion: "RED" | "YELLOW" | "GREEN" | "BLUE";
  attention: "HIGH" | "MODERATE" | "LOW";
  summary: string;
  indicators: AiEvidenceItem[];
  explanation: string;
  dataConsidered: AiEvidenceItem[];
  limitations: string[];
};

export type AiEvidenceItem = {
  key: string;
  label: string;
  value: string;
};

export type AiSuggestionView = {
  id: string;
  analysisRunId: string;
  collectionAttemptNumber: number;
  status: "PENDING" | "COMPLETED" | "UNAVAILABLE";
  suggestedPriority: AiSuggestionResult["suggestion"] | null;
  attentionLevel: AiSuggestionResult["attention"] | null;
  summary: string | null;
  indicators: AiEvidenceItem[];
  explanation: string | null;
  dataConsidered: AiEvidenceItem[];
  limitations: string[];
  model: string;
  createdAt: Date;
};

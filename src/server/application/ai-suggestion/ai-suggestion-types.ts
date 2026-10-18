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
  priority: "RED" | "YELLOW" | "GREEN" | "BLUE";
  attention: "HIGH" | "MODERATE" | "LOW";
  conclusion: string;
  factors: string[];
};

export type AiSuggestionView = {
  id: string;
  analysisRunId: string;
  collectionAttemptNumber: number;
  status: "COMPLETED" | "UNAVAILABLE";
  suggestedPriority: AiSuggestionResult["priority"] | null;
  attentionLevel: AiSuggestionResult["attention"] | null;
  conclusion: string | null;
  factors: string[];
  model: string;
  createdAt: Date;
};

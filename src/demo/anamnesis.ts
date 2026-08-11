/**
 * Conteúdo demonstrativo da V0.
 * Não validado para uso clínico ou produção.
 */

export const demoAnamnesis = {
  version: "V0-DEMO-ANAMNESIS-001",
  intensityOptions: [
    { value: "1", label: "1 — muito leve" },
    { value: "3", label: "3 — leve" },
    { value: "5", label: "5 — moderada" },
    { value: "7", label: "7 — intensa" },
    { value: "10", label: "10 — muito intensa" },
  ],
  alertQuestions: [
    { key: "DEMO_ALERT_SUDDEN_CHANGE", label: "Houve uma mudança súbita percebida nos sintomas?", required: true },
    { key: "DEMO_ALERT_BREATHING", label: "Há dificuldade percebida para respirar neste momento?", required: true },
    { key: "DEMO_ALERT_CONSCIOUSNESS", label: "Houve desmaio ou alteração percebida de consciência?", required: true },
  ],
  examples: {
    mainComplaint: "Ex.: desconforto leve desde a manhã",
    duration: "Ex.: há aproximadamente duas horas",
  },
} as const;

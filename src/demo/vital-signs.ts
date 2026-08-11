/**
 * Dados exclusivamente demonstrativos da V0.
 * Não representam medições clínicas reais.
 */

export const demoVitalSigns = {
  version: "V0-DEMO-VITALS-001",
  technicalRanges: {
    heartRate: { minimum: 30, maximum: 220, unit: "bpm" },
    spo2: { minimum: 50, maximum: 100, unit: "%" },
  },
  scenarios: {
    success: { label: "Coleta bem-sucedida", heartRate: 82, spo2: 98 },
    failure: { label: "Falha de comunicação", errorCode: "DEMO_COMMUNICATION_FAILURE" },
    timeout: { label: "Tempo de conexão excedido", errorCode: "DEMO_TIMEOUT" },
    invalid: { label: "Leitura inválida", heartRate: 999, spo2: 140, errorCode: "DEMO_INVALID_READING" },
  },
} as const;

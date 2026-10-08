import { describe, expect, it } from "vitest";

import {
  expectedPriorityFromCurrentDemoRules,
  SIMULATION_REFERENCE_PREFIX,
  simulationArrivalAt,
  simulationCases,
  simulationPatients,
} from "./simulation-data";

describe("catálogo da simulação controlada", () => {
  it("possui 10 pacientes sintéticos e exatamente 5 triagens por paciente", () => {
    expect(simulationPatients).toHaveLength(10);
    expect(simulationCases).toHaveLength(50);
    for (const patient of simulationPatients) {
      expect(patient.documentReference.startsWith(SIMULATION_REFERENCE_PREFIX)).toBe(true);
      expect(simulationCases.filter((item) => item.patientKey === patient.key)).toHaveLength(5);
    }
  });

  it("usa identificadores e horários únicos em sequência controlada", () => {
    expect(new Set(simulationPatients.map((item) => item.id)).size).toBe(10);
    expect(new Set(simulationCases.map((item) => item.triageId)).size).toBe(50);
    expect(new Set(simulationCases.map((item) => simulationArrivalAt(item).toISOString())).size).toBe(50);
    for (let index = 1; index < simulationCases.length; index += 1) {
      expect(simulationArrivalAt(simulationCases[index]).getTime() - simulationArrivalAt(simulationCases[index - 1]).getTime()).toBe(5 * 60_000);
    }
  });

  it("mantém as entradas dentro das validações técnicas atuais", () => {
    for (const item of simulationCases) {
      expect(item.subjectiveIntensity).toBeGreaterThanOrEqual(1);
      expect(item.subjectiveIntensity).toBeLessThanOrEqual(10);
      expect(item.vitals.bpm).toBeGreaterThanOrEqual(20);
      expect(item.vitals.bpm).toBeLessThanOrEqual(240);
      expect(item.vitals.spo2).toBeGreaterThanOrEqual(50);
      expect(item.vitals.spo2).toBeLessThanOrEqual(100);
      expect(item.vitals.temperatura).toBeGreaterThanOrEqual(20);
      expect(item.vitals.temperatura).toBeLessThanOrEqual(45);
    }
  });

  it("anota a expectativa sem divergir da especificação independente das regras vigentes", () => {
    for (const item of simulationCases) {
      expect(item.expectedPriority).toBe(expectedPriorityFromCurrentDemoRules(item));
    }
    expect(simulationCases.filter((item) => item.expectedPriority === "GREEN")).toHaveLength(15);
    expect(simulationCases.filter((item) => item.expectedPriority === "YELLOW")).toHaveLength(20);
    expect(simulationCases.filter((item) => item.expectedPriority === "RED")).toHaveLength(15);
  });
});

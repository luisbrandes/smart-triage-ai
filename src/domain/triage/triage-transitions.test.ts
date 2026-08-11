import { describe, expect, it } from "vitest";

import { InvalidTriageTransitionError } from "@/domain/triage/triage-transition-error";
import { assertTriageTransition, canTransitionTriage } from "@/domain/triage/triage-transitions";

describe("transições da triagem", () => {
  it.each([
    ["DRAFT", "IDENTIFICATION_IN_PROGRESS"],
    ["ANAMNESIS_IN_PROGRESS", "VITAL_SIGNS_REQUIRED"],
    ["FINAL_ANALYSIS_PENDING", "AWAITING_NURSE_REVIEW"],
    ["AWAITING_NURSE_REVIEW", "CLASSIFIED"],
    ["CLASSIFIED", "REFERRED_TO_CARE"],
    ["REFERRED_TO_CARE", "CLOSED"],
    ["AWAITING_NURSE_REVIEW", "CARE_WAITING"],
    ["CARE_WAITING", "CALLED"],
    ["CALLED", "IN_SERVICE"],
    ["IN_SERVICE", "COMPLETED"],
    ["COMPLETED", "CLOSED"],
  ] as const)("aceita %s -> %s", (from, to) => {
    expect(canTransitionTriage(from, to)).toBe(true);
    expect(() => assertTriageTransition(from, to)).not.toThrow();
  });

  it("reentra no fluxo por uma nova coleta", () => {
    expect(canTransitionTriage("AWAITING_NURSE_REVIEW", "RECOLLECTION_REQUESTED")).toBe(true);
    expect(canTransitionTriage("RECOLLECTION_REQUESTED", "VITAL_SIGNS_IN_PROGRESS")).toBe(true);
  });

  it("impede encaminhamento antes da classificação", () => {
    expect(() => assertTriageTransition("AWAITING_NURSE_REVIEW", "REFERRED_TO_CARE")).toThrow(InvalidTriageTransitionError);
  });

  it.each(["CLOSED", "CANCELLED"] as const)("não permite sair do estado terminal %s", (status) => {
    expect(canTransitionTriage(status, "DRAFT")).toBe(false);
  });

  it.each(["DRAFT", "IDENTIFICATION_IN_PROGRESS", "ANAMNESIS_IN_PROGRESS"] as const)("permite cancelamento explícito a partir de %s", (status) => {
    expect(canTransitionTriage(status, "CANCELLED")).toBe(true);
  });

  it("produz mensagem de erro previsível", () => {
    expect(() => assertTriageTransition("DRAFT", "CLOSED")).toThrow("Transição de triagem inválida: DRAFT -> CLOSED.");
  });
});

import { describe, expect, it } from "vitest";

import { isPatientIntakeResumable, routeForPatientIntakeStatus } from "@/server/application/patient-intake/patient-intake-routes";

describe("retomada da jornada do paciente", () => {
  it("direciona a coleta de sinais vitais para a tela de hardware", () => {
    expect(routeForPatientIntakeStatus("VITAL_SIGNS_REQUIRED", true)).toBe("/paciente/coleta");
  });

  it.each([
    "IDENTIFICATION_IN_PROGRESS",
    "ANAMNESIS_IN_PROGRESS",
    "VITAL_SIGNS_REQUIRED",
    "VITAL_SIGNS_IN_PROGRESS",
    "RECOLLECTION_REQUESTED",
  ] as const)("permite retomar %s", (status) => {
    expect(isPatientIntakeResumable(status)).toBe(true);
  });

  it.each([
    "DRAFT",
    "FINAL_ANALYSIS_PENDING",
    "AWAITING_NURSE_REVIEW",
    "CLASSIFIED",
    "REFERRED_TO_CARE",
    "CLOSED",
    "CANCELLED",
  ] as const)("não reaproveita a jornada encerrada %s", (status) => {
    expect(isPatientIntakeResumable(status)).toBe(false);
  });
});

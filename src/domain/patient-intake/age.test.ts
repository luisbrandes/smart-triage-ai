import { describe, expect, it } from "vitest";

import { getAgeInYears } from "@/domain/patient-intake/age";

describe("cálculo de idade", () => {
  const today = new Date("2026-10-18T12:00:00.000Z");

  it("calcula se o aniversário já ocorreu neste ano", () => {
    expect(getAgeInYears("2008-10-17", today)).toBe(18);
    expect(getAgeInYears("2008-10-19", today)).toBe(17);
  });

  it("retorna null para data inexistente ou em formato inesperado", () => {
    expect(getAgeInYears("2008-02-30", today)).toBeNull();
    expect(getAgeInYears("18/10/2008", today)).toBeNull();
  });
});

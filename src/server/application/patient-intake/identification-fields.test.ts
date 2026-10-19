import { describe, expect, it } from "vitest";

import { identificationSchema } from "@/server/application/patient-intake/patient-intake-validation";

const base = {
  displayName: "Pessoa Demo",
  birthDate: "2000-01-01",
  hasHealthPlan: "no",
};

describe("contrato original de identificação", () => {
  it("accepts the original fields without additional registration data", () => {
    const result = identificationSchema.safeParse({
      ...base,
      sex: "FEMALE",
      documentReference: "REF-DEMO-001",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toMatchObject({
        ...base,
        sex: "FEMALE",
        documentReference: "REF-DEMO-001",
      });
      expect(result.data).not.toHaveProperty("cpf");
    }
  });

  it("does not require CPF, contact, or guardian data for minors", () => {
    expect(identificationSchema.safeParse({ ...base, birthDate: "2015-01-01" }).success).toBe(true);
  });

  it("continues to require the plan name when a health plan is declared", () => {
    expect(identificationSchema.safeParse({ ...base, hasHealthPlan: "yes" }).success).toBe(false);
    expect(identificationSchema.safeParse({ ...base, hasHealthPlan: "yes", planName: "Plano Demo" }).success).toBe(true);
  });
});

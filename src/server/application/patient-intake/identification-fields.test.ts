import { describe, expect, it } from "vitest";

import { identificationSchema } from "@/server/application/patient-intake/patient-intake-validation";

const base = {
  displayName: "Pessoa Demo",
  birthDate: "2000-01-01",
  hasHealthPlan: "no",
};

describe("campos cadastrais opcionais", () => {
  it("normaliza CPF válido e aceita contatos opcionais", () => {
    const result = identificationSchema.safeParse({
      ...base,
      cpf: "529.982.247-25",
      phone: "(11) 99999-9999",
      email: "pessoa@example.com",
    });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.cpf).toBe("52998224725");
  });

  it("rejeita CPF matematicamente inválido e e-mail malformado", () => {
    expect(
      identificationSchema.safeParse({ ...base, cpf: "111.111.111-11" }).success,
    ).toBe(false);
    expect(
      identificationSchema.safeParse({ ...base, email: "invalido" }).success,
    ).toBe(false);
  });

  it("exige mãe e responsável legal quando a pessoa é menor de idade", () => {
    const minor = { ...base, birthDate: "2015-01-01" };

    expect(identificationSchema.safeParse(minor).success).toBe(false);
    expect(
      identificationSchema.safeParse({
        ...minor,
        motherName: "Pessoa responsável fictícia",
        legalRepresentativeName: "Representante fictício",
      }).success,
    ).toBe(true);
  });

  it("não exige dados da mãe ou responsável para adultos", () => {
    expect(identificationSchema.safeParse(base).success).toBe(true);
  });
});

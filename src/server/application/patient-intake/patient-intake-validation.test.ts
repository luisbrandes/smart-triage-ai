import { describe, expect, it } from "vitest";

import { demoAnamnesis } from "@/demo/anamnesis";
import { demoConsent } from "@/demo/consent";
import { anamnesisSchema, consentSchema, identificationSchema } from "@/server/application/patient-intake/patient-intake-validation";

const validIdentification = {
  displayName: "Pessoa Demo",
  birthDate: "2000-01-01",
  hasHealthPlan: "no",
};

describe("validação da identificação", () => {
  it("rejeita identificação incompleta", () => {
    expect(identificationSchema.safeParse({}).success).toBe(false);
  });

  it("rejeita data futura", () => {
    expect(identificationSchema.safeParse({ ...validIdentification, birthDate: "2999-01-01" }).success).toBe(false);
  });

  it("exige nome do plano quando informado", () => {
    expect(identificationSchema.safeParse({ ...validIdentification, hasHealthPlan: "yes" }).success).toBe(false);
  });

  it("aceita identificação fictícia mínima", () => {
    expect(identificationSchema.safeParse(validIdentification).success).toBe(true);
  });
});

describe("validação do consentimento", () => {
  it("exige aceite explícito", () => {
    expect(consentSchema.safeParse({}).success).toBe(false);
    expect(consentSchema.safeParse({ accepted: "yes" }).success).toBe(true);
  });
});

describe("validação da anamnese", () => {
  const requiredAnswers = Object.fromEntries(demoAnamnesis.alertQuestions.map((question) => [question.key, "no"]));
  const valid = {
    mainComplaint: "Queixa inteiramente fictícia",
    subjectiveIntensity: "3",
    approximateDuration: "Há duas horas, exemplo fictício",
    alertAnswers: requiredAnswers,
  };

  it("exige as perguntas demonstrativas obrigatórias", () => {
    expect(anamnesisSchema.safeParse({ ...valid, alertAnswers: {} }).success).toBe(false);
  });

  it("aceita o catálogo demonstrativo completo", () => {
    expect(anamnesisSchema.safeParse(valid).success).toBe(true);
  });
});

describe("identificação explícita do conteúdo demo", () => {
  it("mantém versões e textos marcados como demonstração", () => {
    expect(demoConsent.version).toContain("DEMO");
    expect(demoAnamnesis.version).toContain("DEMO");
    expect(demoConsent.paragraphs.join(" ")).toMatch(/demonstrativo|experimental/i);
  });
});

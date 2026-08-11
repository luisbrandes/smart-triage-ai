import { z } from "zod";

import { demoAnamnesis } from "@/demo/anamnesis";

const optionalShortText = z.string().trim().max(120, "Use no máximo 120 caracteres.").optional();
const optionalLongText = z.string().trim().max(500, "Use no máximo 500 caracteres.").optional();

export const identificationSchema = z.object({
  displayName: z.string().trim().min(2, "Informe um nome fictício.").max(100, "Use no máximo 100 caracteres."),
  birthDate: z.string().min(1, "Informe uma data de nascimento fictícia.").refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.getTime());
  }, "Informe uma data válida.").refine((value) => new Date(`${value}T00:00:00.000Z`).getTime() <= Date.now(), "A data não pode estar no futuro."),
  sex: optionalShortText,
  documentReference: optionalShortText,
  hasHealthPlan: z.enum(["yes", "no"], { message: "Informe se possui plano." }),
  planName: optionalShortText,
}).superRefine((value, context) => {
  if (value.hasHealthPlan === "yes" && !value.planName) {
    context.addIssue({ code: "custom", path: ["planName"], message: "Informe um nome fictício para o plano." });
  }
});

export const consentSchema = z.object({
  accepted: z.literal("yes", { message: "O aceite é obrigatório para continuar." }),
});

export const anamnesisSchema = z.object({
  mainComplaint: z.string().trim().min(3, "Descreva uma queixa fictícia.").max(200, "Use no máximo 200 caracteres."),
  additionalDescription: optionalLongText,
  subjectiveIntensity: z.coerce.number().int().min(1, "Selecione uma intensidade.").max(10, "Selecione uma intensidade válida."),
  approximateDuration: z.string().trim().min(2, "Informe início ou duração aproximada.").max(120, "Use no máximo 120 caracteres."),
  declaredAllergies: optionalLongText,
  declaredMedications: optionalLongText,
  declaredPreexistingConditions: optionalLongText,
  alertAnswers: z.record(z.string(), z.enum(["yes", "no"])),
}).superRefine((value, context) => {
  for (const question of demoAnamnesis.alertQuestions) {
    if (question.required && !value.alertAnswers[question.key]) {
      context.addIssue({ code: "custom", path: ["alertAnswers", question.key], message: "Responda esta pergunta demonstrativa." });
    }
  }
});

export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const errors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    errors[key] = [...(errors[key] ?? []), issue.message];
  }
  return errors;
}

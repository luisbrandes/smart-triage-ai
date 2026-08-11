"use client";

import { useActionState } from "react";

import { completeAnamnesisAction, type IntakeActionState } from "@/app/paciente/triagem/actions";
import { demoAnamnesis } from "@/demo/anamnesis";
import { fieldClassName, FormField } from "@/features/patient-intake/components/form-field";

const initialState: IntakeActionState = {};

export function AnamnesisForm() {
  const [state, action, pending] = useActionState(completeAnamnesisAction, initialState);
  const error = (field: string) => state.errors?.[field]?.[0];

  return (
    <form action={action} className="space-y-7" noValidate>
      {state.message && <p className="rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger" role="alert">{state.message}</p>}
      <FormField error={error("mainComplaint")} hint={demoAnamnesis.examples.mainComplaint} htmlFor="mainComplaint" label="Queixa principal">
        <input className={fieldClassName} id="mainComplaint" maxLength={200} name="mainComplaint" />
      </FormField>
      <FormField htmlFor="additionalDescription" label="Descrição complementar (opcional)">
        <textarea className={`${fieldClassName} min-h-28 resize-y`} id="additionalDescription" maxLength={500} name="additionalDescription" />
      </FormField>
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField error={error("subjectiveIntensity")} htmlFor="subjectiveIntensity" label="Intensidade percebida">
          <select className={fieldClassName} defaultValue="" id="subjectiveIntensity" name="subjectiveIntensity"><option disabled value="">Selecione</option>{demoAnamnesis.intensityOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>
        </FormField>
        <FormField error={error("approximateDuration")} hint={demoAnamnesis.examples.duration} htmlFor="approximateDuration" label="Início ou duração aproximada">
          <input className={fieldClassName} id="approximateDuration" maxLength={120} name="approximateDuration" />
        </FormField>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        <FormField htmlFor="declaredAllergies" label="Alergias declaradas (opcional)"><textarea className={`${fieldClassName} min-h-24 resize-y`} id="declaredAllergies" maxLength={500} name="declaredAllergies" /></FormField>
        <FormField htmlFor="declaredMedications" label="Medicamentos em uso (opcional)"><textarea className={`${fieldClassName} min-h-24 resize-y`} id="declaredMedications" maxLength={500} name="declaredMedications" /></FormField>
        <FormField htmlFor="declaredPreexistingConditions" label="Condições preexistentes (opcional)"><textarea className={`${fieldClassName} min-h-24 resize-y`} id="declaredPreexistingConditions" maxLength={500} name="declaredPreexistingConditions" /></FormField>
      </div>

      <fieldset className="rounded-lg border border-border p-4 sm:p-5">
        <legend className="px-2 text-base font-semibold">Sinais de atenção</legend>
        <p className="mb-5 text-sm leading-6 text-text-secondary">Responda com atenção. Estas informações serão consideradas na análise e revisadas pela enfermagem.</p>
        <div className="space-y-6">
          {demoAnamnesis.alertQuestions.map((question) => {
            const questionError = error(`alertAnswers.${question.key}`);
            return (
              <div key={question.key}>
                <p className="text-sm font-medium" id={`${question.key}-label`}>{question.label}</p>
                <div aria-labelledby={`${question.key}-label`} className="mt-2 flex gap-5" role="radiogroup">
                  <label className="flex min-h-11 items-center gap-2"><input name={question.key} type="radio" value="yes" /> Sim</label>
                  <label className="flex min-h-11 items-center gap-2"><input name={question.key} type="radio" value="no" /> Não</label>
                </div>
                {questionError && <p className="text-sm text-danger">{questionError}</p>}
              </div>
            );
          })}
        </div>
      </fieldset>

      <button className="min-h-12 w-full rounded-md bg-primary px-5 font-semibold text-primary-contrast disabled:cursor-wait disabled:opacity-60 sm:w-auto" disabled={pending} type="submit">{pending ? "Salvando…" : "Concluir anamnese"}</button>
    </form>
  );
}

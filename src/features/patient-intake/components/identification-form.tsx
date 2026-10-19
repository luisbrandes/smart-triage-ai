"use client";

import { useActionState } from "react";

import { saveIdentificationAction, type IntakeActionState } from "@/app/paciente/triagem/actions";
import { fieldClassName, FormField } from "@/features/patient-intake/components/form-field";

const initialState: IntakeActionState = {};

export function IdentificationForm() {
  const [state, action, pending] = useActionState(saveIdentificationAction, initialState);
  const error = (field: string) => state.errors?.[field]?.[0];

  return (
    <form action={action} className="space-y-6" noValidate>
      {state.message && <p className="rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger" role="alert">{state.message}</p>}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField error={error("displayName")} htmlFor="displayName" label="Nome para identificação">
          <input aria-describedby={error("displayName") ? "displayName-error" : undefined} autoComplete="off" className={fieldClassName} id="displayName" maxLength={100} name="displayName" placeholder="Ex.: Maria Silva" />
        </FormField>
        <FormField error={error("birthDate")} htmlFor="birthDate" label="Data de nascimento">
          <input aria-describedby={error("birthDate") ? "birthDate-error" : undefined} className={fieldClassName} id="birthDate" name="birthDate" type="date" />
        </FormField>
        <FormField htmlFor="sex" label="Sexo informado (opcional)">
          <select className={fieldClassName} defaultValue="" id="sex" name="sex"><option value="">Prefiro a não informar</option><option value="FEMALE">Feminino</option><option value="MALE">Masculino</option><option value="OTHER">Outro</option></select>
        </FormField>
        <FormField hint="Campo opcional para a referência utilizada no atendimento." htmlFor="documentReference" label="Referência documental (opcional)">
          <input autoComplete="off" className={fieldClassName} id="documentReference" maxLength={120} name="documentReference" placeholder="Ex.: referência do atendimento" />
        </FormField>
      </div>

      <fieldset aria-describedby={error("hasHealthPlan") ? "hasHealthPlan-error" : undefined}>
        <legend className="text-sm font-semibold">Possui plano de saúde?</legend>
        <div className="mt-3 flex gap-5">
          <label className="flex min-h-11 items-center gap-2"><input name="hasHealthPlan" type="radio" value="yes" /> Sim</label>
          <label className="flex min-h-11 items-center gap-2"><input name="hasHealthPlan" type="radio" value="no" /> Não</label>
        </div>
        {error("hasHealthPlan") && <p className="text-sm text-danger" id="hasHealthPlan-error">{error("hasHealthPlan")}</p>}
      </fieldset>

      <FormField error={error("planName")} hint="Obrigatório apenas quando a opção “Sim” for marcada." htmlFor="planName" label="Nome do plano">
        <input autoComplete="off" className={fieldClassName} id="planName" maxLength={120} name="planName" placeholder="Ex.: nome do plano" />
      </FormField>

      <button className="min-h-12 w-full rounded-md bg-primary px-5 font-semibold text-primary-contrast disabled:cursor-wait disabled:opacity-60 sm:w-auto" disabled={pending} type="submit">{pending ? "Salvando…" : "Salvar e continuar"}</button>
    </form>
  );
}

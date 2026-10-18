"use client";

import { useActionState, useState } from "react";

import { saveIdentificationAction, type IntakeActionState } from "@/app/paciente/triagem/actions";
import { getAgeInYears } from "@/domain/patient-intake/age";
import { fieldClassName, FormField } from "@/features/patient-intake/components/form-field";

const initialState: IntakeActionState = {};

export function IdentificationForm() {
  const [state, action, pending] = useActionState(saveIdentificationAction, initialState);
  const [birthDate, setBirthDate] = useState("");
  const error = (field: string) => state.errors?.[field]?.[0];
  const isMinor = (getAgeInYears(birthDate) ?? 18) < 18;
  const maskCpf = (value: string) => value.replace(/\D/g, "").slice(0, 11).replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
  const maskPhone = (value: string) => { const digits = value.replace(/\D/g, "").slice(0, 11); return digits.length <= 10 ? digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{4})(\d)/, "$1-$2") : digits.replace(/(\d{2})(\d)/, "($1) $2").replace(/(\d{5})(\d)/, "$1-$2"); };

  return (
    <form action={action} className="space-y-6" noValidate>
      {state.message && <p className="rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger" role="alert">{state.message}</p>}
      <div className="grid gap-5 sm:grid-cols-2">
        <FormField error={error("displayName")} htmlFor="displayName" label="Nome para identificação">
          <input aria-describedby={error("displayName") ? "displayName-error" : undefined} autoComplete="off" className={fieldClassName} id="displayName" maxLength={100} name="displayName" placeholder="Ex.: Maria Silva" />
        </FormField>
        <FormField error={error("birthDate")} htmlFor="birthDate" label="Data de nascimento">
          <input aria-describedby={error("birthDate") ? "birthDate-error" : undefined} className={fieldClassName} id="birthDate" name="birthDate" onChange={(event) => setBirthDate(event.currentTarget.value)} type="date" value={birthDate} />
        </FormField>
        <FormField htmlFor="sex" label="Sexo informado (opcional)">
          <select className={fieldClassName} defaultValue="" id="sex" name="sex"><option value="">Prefiro não informar</option><option value="FEMALE">Feminino</option><option value="MALE">Masculino</option><option value="OTHER">Outro</option></select>
        </FormField>
        <FormField error={error("cpf")} hint="Opcional; aceito com ou sem pontuação." htmlFor="cpf" label="CPF (opcional)">
          <input aria-describedby={error("cpf") ? "cpf-error" : undefined} autoComplete="off" className={fieldClassName} id="cpf" inputMode="numeric" maxLength={14} name="cpf" onInput={(event) => { event.currentTarget.value = maskCpf(event.currentTarget.value); }} placeholder="000.000.000-00" />
        </FormField>
        <FormField error={error("phone")} htmlFor="phone" label="Telefone (opcional)">
          <input aria-describedby={error("phone") ? "phone-error" : undefined} autoComplete="tel" className={fieldClassName} id="phone" inputMode="tel" maxLength={15} name="phone" onInput={(event) => { event.currentTarget.value = maskPhone(event.currentTarget.value); }} placeholder="(00) 00000-0000" />
        </FormField>
        <FormField error={error("email")} htmlFor="email" label="E-mail (opcional)">
          <input aria-describedby={error("email") ? "email-error" : undefined} autoComplete="email" className={fieldClassName} id="email" name="email" type="email" placeholder="nome@exemplo.com" />
        </FormField>
        <FormField hint="Campo opcional para a referência utilizada no atendimento." htmlFor="documentReference" label="Referência documental (opcional)">
          <input autoComplete="off" className={fieldClassName} id="documentReference" maxLength={120} name="documentReference" placeholder="Ex.: referência do atendimento" />
        </FormField>
      </div>

      {isMinor && (
        <fieldset className="space-y-4 rounded-md border border-border p-4">
          <legend className="px-1 text-sm font-semibold">Informações do menor</legend>
          <p className="text-sm text-text-secondary">
            Para pessoas menores de 18 anos, informe o nome da mãe e do responsável legal.
          </p>
          <div className="grid gap-5 sm:grid-cols-2">
            <FormField error={error("motherName")} htmlFor="motherName" label="Nome da mãe">
              <input aria-describedby={error("motherName") ? "motherName-error" : undefined} autoComplete="off" className={fieldClassName} id="motherName" maxLength={120} name="motherName" required />
            </FormField>
            <FormField error={error("legalRepresentativeName")} htmlFor="legalRepresentativeName" label="Nome do responsável legal">
              <input aria-describedby={error("legalRepresentativeName") ? "legalRepresentativeName-error" : undefined} autoComplete="off" className={fieldClassName} id="legalRepresentativeName" maxLength={120} name="legalRepresentativeName" required />
            </FormField>
            <FormField error={error("legalRepresentativePhone")} htmlFor="legalRepresentativePhone" label="Telefone do responsável (opcional)">
              <input aria-describedby={error("legalRepresentativePhone") ? "legalRepresentativePhone-error" : undefined} autoComplete="tel" className={fieldClassName} id="legalRepresentativePhone" inputMode="tel" maxLength={15} name="legalRepresentativePhone" onInput={(event) => { event.currentTarget.value = maskPhone(event.currentTarget.value); }} />
            </FormField>
          </div>
        </fieldset>
      )}

      <fieldset>
        <legend className="text-sm font-semibold">Possui plano de saúde?</legend>
        <div className="mt-3 flex gap-5">
          <label className="flex min-h-11 items-center gap-2"><input name="hasHealthPlan" type="radio" value="yes" /> Sim</label>
          <label className="flex min-h-11 items-center gap-2"><input name="hasHealthPlan" type="radio" value="no" /> Não</label>
        </div>
        {error("hasHealthPlan") && <p className="text-sm text-danger">{error("hasHealthPlan")}</p>}
      </fieldset>

      <FormField error={error("planName")} hint="Obrigatório apenas quando a opção “Sim” for marcada." htmlFor="planName" label="Nome do plano">
        <input autoComplete="off" className={fieldClassName} id="planName" maxLength={120} name="planName" placeholder="Ex.: nome do plano" />
      </FormField>

      <button className="min-h-12 w-full rounded-md bg-primary px-5 font-semibold text-primary-contrast disabled:cursor-wait disabled:opacity-60 sm:w-auto" disabled={pending} type="submit">{pending ? "Salvando…" : "Salvar e continuar"}</button>
    </form>
  );
}

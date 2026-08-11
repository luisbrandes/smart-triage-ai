"use client";

import { useActionState } from "react";

import { acceptConsentAction, type IntakeActionState } from "@/app/paciente/triagem/actions";

const initialState: IntakeActionState = {};

export function ConsentForm() {
  const [state, action, pending] = useActionState(acceptConsentAction, initialState);
  const error = state.errors?.accepted?.[0];

  return (
    <form action={action} className="mt-6" noValidate>
      {state.message && <p className="mb-4 rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger" role="alert">{state.message}</p>}
      <label className="flex cursor-pointer items-start gap-3 rounded-md border border-border bg-surface-raised p-4">
        <input aria-describedby={error ? "accepted-error" : undefined} className="mt-1 size-4" name="accepted" type="checkbox" value="yes" />
        <span><strong className="block text-sm">Li e aceito o termo de consentimento</strong><span className="mt-1 block text-sm leading-6 text-text-secondary">Confirmo que compreendi o uso das informações durante a triagem.</span></span>
      </label>
      {error && <p className="mt-2 text-sm text-danger" id="accepted-error">{error}</p>}
      <button className="mt-6 min-h-12 w-full rounded-md bg-primary px-5 font-semibold text-primary-contrast disabled:cursor-wait disabled:opacity-60 sm:w-auto" disabled={pending} type="submit">{pending ? "Registrando…" : "Aceitar e continuar"}</button>
    </form>
  );
}

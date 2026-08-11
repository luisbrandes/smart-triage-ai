"use client";
import { useActionState } from "react";
import { nursingLoginAction, type NursingLoginState } from "@/app/acesso-enfermagem/actions";
const initial: NursingLoginState = {};
export function NursingLoginForm() { const [state, action, pending] = useActionState(nursingLoginAction, initial); return <form action={action} className="mt-6 space-y-4"><label className="block text-sm font-medium">Credencial de acesso<input autoComplete="current-password" className="mt-1 min-h-12 w-full rounded-md border border-border bg-surface px-3" name="credential" required type="password" /></label>{state.message && <p className="text-sm text-danger" role="alert">{state.message}</p>}<button className="min-h-12 w-full rounded-md bg-primary px-5 font-semibold text-primary-contrast disabled:opacity-60" disabled={pending}>{pending ? "Validando…" : "Entrar na área da enfermagem"}</button></form>; }

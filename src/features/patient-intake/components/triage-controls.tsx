"use client";

import { cancelPatientTriageAction } from "@/app/paciente/triagem/actions";

export function TriageControls() {
  return <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><p className="text-xs text-text-muted">Você pode revisar etapas anteriores ou encerrar esta triagem.</p><form action={cancelPatientTriageAction} onSubmit={(event) => { if (!window.confirm("Encerrar triagem?\n\nSe você encerrar agora, os dados desta triagem serão descartados e será necessário iniciar novamente.")) event.preventDefault(); }}><button className="min-h-10 rounded-md border border-danger px-3 text-sm font-semibold text-danger hover:bg-danger/10" type="submit">Encerrar triagem</button></form></div>;
}

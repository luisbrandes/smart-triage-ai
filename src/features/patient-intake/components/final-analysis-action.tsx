"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

import { completeVitalSignsAction } from "@/app/paciente/triagem/sinais-vitais/actions";
import { Icon } from "@/shared/ui/icon";

const reasoningStages = [
  "Revisando informações da anamnese",
  "Integrando frequência cardíaca e SpO₂",
  "Organizando sinais de atenção",
  "Verificando consistência dos dados",
  "Preparando recomendação assistiva",
] as const;

export function FinalAnalysisAction({ autoStart = false }: { autoStart?: boolean }) {
  const [analyzing, setAnalyzing] = useState(false);
  const [stage, setStage] = useState(0);
  const submitAfterExperience = useRef(false);
  const timeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!analyzing) return;
    const interval = window.setInterval(() => setStage((current) => Math.min(current + 1, reasoningStages.length - 1)), 850);
    return () => window.clearInterval(interval);
  }, [analyzing]);

  useEffect(() => () => { if (timeoutRef.current) window.clearTimeout(timeoutRef.current); }, []);
  useEffect(() => {
    if (!autoStart) return;
    const frame = window.requestAnimationFrame(() => (document.getElementById("final-analysis-form") as HTMLFormElement | null)?.requestSubmit());
    return () => window.cancelAnimationFrame(frame);
  }, [autoStart]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (submitAfterExperience.current) { submitAfterExperience.current = false; return; }
    event.preventDefault();
    if (analyzing) return;
    const form = event.currentTarget;
    setAnalyzing(true);
    setStage(0);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timeoutRef.current = window.setTimeout(() => {
      submitAfterExperience.current = true;
      form.requestSubmit();
    }, reducedMotion ? 1000 : 4700);
  }

  const progress = analyzing ? Math.round(((stage + 1) / reasoningStages.length) * 100) : 0;
  return (
    <form action={completeVitalSignsAction} className="mt-8" id="final-analysis-form" onSubmit={handleSubmit}>
      <header className="mb-6 text-center"><p className="text-sm font-semibold text-primary">Análise Smart Triage</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Organizando sua recomendação</h1><p className="mx-auto mt-3 max-w-xl leading-7 text-text-secondary">Estamos combinando as informações da anamnese com os sinais vitais coletados.</p></header>
      <section aria-live="polite" className="overflow-hidden rounded-xl border border-primary/20 bg-slate-900 p-5 text-white shadow-raised sm:p-7">
        <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-emerald-400/15 text-emerald-300"><Icon className="animate-pulse motion-reduce:animate-none" name="sparkle" size={22} /></span><div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-300">Smart Triage trabalhando</p><h2 className="mt-1 font-semibold">{analyzing ? reasoningStages[stage] : "Preparando processamento"}</h2></div></div>
        <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10"><span className="block h-full rounded-full bg-emerald-400 transition-[width] duration-700 motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div>
        <div className="mt-5 grid grid-cols-3 gap-2 text-center text-xs text-slate-400"><span className="rounded-md bg-white/[0.05] px-2 py-3">Anamnese</span><span className="rounded-md bg-white/[0.05] px-2 py-3">Sinais vitais</span><span className="rounded-md bg-white/[0.05] px-2 py-3">Recomendação</span></div>
        <p className="mt-5 text-xs leading-5 text-slate-400">O processamento atual usa critérios determinísticos. A recomendação final será revisada pela enfermagem.</p>
      </section>
      <button className="sr-only" disabled={analyzing} type="submit">Iniciar análise</button>
    </form>
  );
}

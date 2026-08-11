"use client";

import { type FormEvent, type KeyboardEvent, useActionState, useEffect, useRef, useState } from "react";

import { collectManualAction, collectSimulatedAction, type VitalSignsActionState } from "@/app/paciente/triagem/sinais-vitais/actions";
import { demoVitalSigns } from "@/demo/vital-signs";
import { fieldClassName, FormField } from "@/features/patient-intake/components/form-field";
import { Icon } from "@/shared/ui/icon";

const initial: VitalSignsActionState = {};

export function ManualVitalSignsForm() {
  const [state, action, pending] = useActionState(collectManualAction, initial);
  return <form action={action} className="space-y-4"><FormField htmlFor="heartRate" label="Frequência cardíaca"><input className={fieldClassName} id="heartRate" name="heartRate" type="number" /></FormField><FormField htmlFor="spo2" label="Saturação de oxigênio (SpO₂)"><input className={fieldClassName} id="spo2" name="spo2" step="0.1" type="number" /></FormField>{state.message && <p className="text-sm text-danger">{state.message}</p>}<button className="min-h-11 rounded-md bg-primary px-4 font-semibold text-primary-contrast disabled:opacity-60" disabled={pending}>{pending ? "Registrando…" : "Registrar coleta manual"}</button></form>;
}

const collectionStages = ["Conectando ao sensor", "Detectando pulso", "Recebendo sinais", "Verificando qualidade", "Estabilizando leitura", "Preparando resultado"] as const;
type Scenario = keyof typeof demoVitalSigns.scenarios;

function SignalWave({ active }: { active: boolean }) {
  return (
    <div aria-hidden="true" className="relative h-20 overflow-hidden rounded-lg border border-white/10 bg-slate-950/55">
      <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,.04)_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className={`signal-trace absolute inset-y-0 left-0 flex w-[200%] items-center text-emerald-300 ${active ? "is-active" : ""}`}>
        <svg className="h-14 w-1/2 shrink-0" preserveAspectRatio="none" viewBox="0 0 600 80"><polyline fill="none" points="0,44 72,44 88,40 101,44 125,44 145,8 164,70 181,31 198,44 272,44 288,40 301,44 325,44 345,8 364,70 381,31 398,44 472,44 488,40 501,44 525,44 545,8 564,70 581,31 600,44" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg>
        <svg className="h-14 w-1/2 shrink-0" preserveAspectRatio="none" viewBox="0 0 600 80"><polyline fill="none" points="0,44 72,44 88,40 101,44 125,44 145,8 164,70 181,31 198,44 272,44 288,40 301,44 325,44 345,8 364,70 381,31 398,44 472,44 488,40 501,44 525,44 545,8 564,70 581,31 600,44" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" vectorEffect="non-scaling-stroke" /></svg>
      </div>
    </div>
  );
}

function CollectionMonitor({ active, scenario }: { active: boolean; scenario: Scenario }) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setTick((current) => current + 1), 450);
    return () => window.clearInterval(timer);
  }, [active]);

  const stageIndex = active ? Math.min(Math.floor(tick / 2), collectionStages.length - 1) : 0;
  const progress = active ? Math.min(96, 12 + tick * 8) : 0;
  const targetHeartRate = scenario === "invalid" ? 999 : 82;
  const targetSpo2 = scenario === "invalid" ? 140 : 98;
  const hasReading = active && tick >= 2 && scenario !== "failure" && scenario !== "timeout";
  const heartRate = hasReading ? Math.min(targetHeartRate, 68 + tick * 2) : null;
  const spo2 = hasReading ? Math.min(targetSpo2, 94 + Math.floor(tick / 2)) : null;
  const quality = active ? (tick < 4 ? "Detectando" : scenario === "invalid" ? "Leitura inconsistente" : "Sinal estável") : "Aguardando início";

  return (
    <section aria-label="Monitor de coleta de sinais vitais" aria-live="polite" className="overflow-hidden rounded-xl bg-slate-900 text-white shadow-raised">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold"><span className={`size-2.5 rounded-full ${active ? "animate-pulse bg-emerald-400 motion-reduce:animate-none" : "bg-slate-500"}`} />{active ? "Sensor conectado" : "Dispositivo pronto"}</div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs text-slate-300">Coleta integrada</span>
      </div>
      <div className="space-y-4 p-4 sm:p-5">
        <SignalWave active={active} />
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-white/[0.07] p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300"><Icon name="pulse" size={16} />Batimentos</div><p className="mt-2 text-4xl font-semibold tabular-nums">{heartRate ?? "--"}<span className="ml-1 text-sm font-medium text-slate-400">bpm</span></p></div>
          <div className="rounded-lg bg-white/[0.07] p-4"><div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-300"><Icon name="activity" size={16} />SpO₂</div><p className="mt-2 text-4xl font-semibold tabular-nums">{spo2 ?? "--"}<span className="ml-1 text-sm font-medium text-slate-400">%</span></p></div>
        </div>
        <div>
          <div className="flex items-center justify-between gap-3 text-sm"><strong>{active ? collectionStages[stageIndex] : "Pronto para iniciar"}</strong><span className="text-slate-400">{progress}%</span></div>
          <div aria-label={`Progresso da coleta: ${progress}%`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={progress} className="mt-2 h-2 overflow-hidden rounded-full bg-white/10" role="progressbar"><span className="block h-full rounded-full bg-emerald-400 transition-[width] duration-500 motion-reduce:transition-none" style={{ width: `${progress}%` }} /></div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 pt-3 text-xs text-slate-400"><span>Qualidade: <strong className="text-slate-200">{quality}</strong></span><span>Mantenha o sensor estável durante a coleta</span></div>
      </div>
    </section>
  );
}

export function SimulatedVitalSignsForm() {
  const [state, action, pending] = useActionState(collectSimulatedAction, initial);
  const [scenario, setScenario] = useState<Scenario>("success");
  const [collecting, setCollecting] = useState(false);
  const submitAfterExperience = useRef(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => () => { if (timerRef.current) window.clearTimeout(timerRef.current); }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    if (submitAfterExperience.current) { submitAfterExperience.current = false; return; }
    event.preventDefault();
    if (collecting || pending) return;
    const form = event.currentTarget;
    setCollecting(true);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    timerRef.current = window.setTimeout(() => {
      submitAfterExperience.current = true;
      setCollecting(false);
      form.requestSubmit();
    }, reducedMotion ? 900 : 5200);
  }

  const active = collecting || pending;
  return (
    <form action={action} className="space-y-4" onSubmit={handleSubmit}>
      <CollectionMonitor active={active} key={active ? `active-${scenario}` : `idle-${scenario}`} scenario={scenario} />
      <input name="scenario" type="hidden" value={scenario} />
      <FormField htmlFor="scenario-select" label="Perfil de coleta"><select className={fieldClassName} disabled={active} id="scenario-select" onChange={(event) => setScenario(event.target.value as Scenario)} value={scenario}>{Object.entries(demoVitalSigns.scenarios).map(([key, value]) => <option key={key} value={key}>{value.label}</option>)}</select></FormField>
      {state.message && <p className="rounded-md border border-danger/20 bg-danger/10 p-3 text-sm text-danger" role="alert">{state.message}</p>}
      <button className="min-h-12 w-full rounded-md bg-primary px-4 font-semibold text-primary-contrast disabled:cursor-wait disabled:opacity-60" disabled={active}>{active ? "Coletando sinais…" : "Conectar e iniciar coleta"}</button>
    </form>
  );
}

type CollectionTab = "integrated" | "manual";

export function VitalSignsCollectionTabs() {
  const [activeTab, setActiveTab] = useState<CollectionTab>("integrated");
  const tabs = [
    { id: "integrated" as const, label: "Coleta integrada", description: "Recomendada", icon: "activity" as const },
    { id: "manual" as const, label: "Entrada manual", description: "Alternativa", icon: "clipboard" as const },
  ];

  function handleTabKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const nextIndex = event.key === "ArrowRight" ? (index + 1) % tabs.length : (index - 1 + tabs.length) % tabs.length;
    const nextTab = tabs[nextIndex];
    setActiveTab(nextTab.id);
    document.getElementById(`${nextTab.id}-tab`)?.focus();
  }

  return (
    <section className="overflow-hidden rounded-lg border border-border bg-surface shadow-soft">
      <div aria-label="Método de coleta" className="grid grid-cols-2 border-b border-border bg-surface-raised p-1.5" role="tablist">
        {tabs.map((tab, index) => {
          const selected = activeTab === tab.id;
          return <button aria-controls={`${tab.id}-panel`} aria-selected={selected} className={`flex min-h-14 items-center justify-center gap-3 rounded-md px-3 text-left transition-colors ${selected ? "bg-surface text-primary shadow-soft" : "text-text-secondary hover:bg-surface/60"}`} id={`${tab.id}-tab`} key={tab.id} onClick={() => setActiveTab(tab.id)} onKeyDown={(event) => handleTabKeyDown(event, index)} role="tab" tabIndex={selected ? 0 : -1} type="button"><Icon name={tab.icon} size={19} /><span><strong className="block text-sm">{tab.label}</strong><span className="hidden text-xs font-normal text-text-muted sm:block">{tab.description}</span></span></button>;
        })}
      </div>
      <div aria-labelledby={`${activeTab}-tab`} className="p-5 sm:p-6" id={`${activeTab}-panel`} role="tabpanel">
        <header className="mb-5"><h2 className="text-lg font-semibold">{activeTab === "integrated" ? "Coleta pelo dispositivo" : "Registro manual"}</h2><p className="mt-1 text-sm leading-6 text-text-secondary">{activeTab === "integrated" ? "Acompanhe o recebimento e a qualidade dos sinais em tempo real." : "Informe os valores observados quando a coleta integrada não estiver disponível."}</p></header>
        {activeTab === "integrated" ? <SimulatedVitalSignsForm /> : <ManualVitalSignsForm />}
      </div>
    </section>
  );
}

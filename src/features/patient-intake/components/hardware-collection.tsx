"use client";

import { useActionState, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { acceptPhysicalDeviceCollectionAction, type PhysicalCollectionActionState } from "@/app/paciente/coleta/actions";
import { Icon } from "@/shared/ui/icon";
import { StatusIndicator } from "@/shared/ui/status-indicator";

const deviceId = "ESP32-001";
const storageKey = `smart-triage:device-session:${deviceId}`;
const pollingIntervalMs = 2_000;

type CollectionStatus = "WAITING" | "ACTIVE" | "CANCELLED" | "COMPLETED";
type Reading = { readingId: string; bpm: number; spo2: number; temperatura: number; receivedAt: string };
type Session = { sessionId: string; deviceId: string; status: CollectionStatus; startedAt: string | null; completedAt: string | null; cancelledAt: string | null; readings: Reading[] };
type ScreenState = "STARTING" | "WAITING" | "MEASURING" | "COMPLETED" | "CANCELLED" | "ERROR";

function latestReading(session: Session | null) { return session?.readings.at(-1) ?? null; }

function toScreenState(session: Session | null): ScreenState {
  if (!session) return "STARTING";
  if (session.status === "COMPLETED") return "COMPLETED";
  if (session.status === "CANCELLED") return "CANCELLED";
  return latestReading(session) ? "MEASURING" : "WAITING";
}

async function responseJson<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error("request-failed");
  return response.json() as Promise<T>;
}

function ReadingValue({ label, value, unit }: { label: string; value: number | null; unit: string }) {
  return <div className="rounded-lg border border-border bg-surface-raised p-4"><p className="text-sm text-text-secondary">{label}</p><p className="mt-1 text-2xl font-semibold text-foreground">{value === null ? "—" : <>{value} <span className="text-base font-medium text-text-secondary">{unit}</span></>}</p></div>;
}

export function HardwareCollection() {
  const [session, setSession] = useState<Session | null>(null);
  const [screenState, setScreenState] = useState<ScreenState>("STARTING");
  const [isCancelling, setIsCancelling] = useState(false);
  const [selectedReadingId, setSelectedReadingId] = useState("");
  const [acceptanceState, acceptReading, isAccepting] = useActionState<PhysicalCollectionActionState, FormData>(acceptPhysicalDeviceCollectionAction, {});
  const started = useRef(false);

  const loadSession = useCallback(async (sessionId: string) => {
    const current = await responseJson<Session>(await fetch(`/api/triage/session/${sessionId}`, { cache: "no-store" }));
    setSession(current);
    setScreenState(toScreenState(current));
    return current;
  }, []);

  const startCollection = useCallback(async () => {
    setScreenState("STARTING");
    setSelectedReadingId("");
    const startedSession = await responseJson<{ sessionId: string }>(await fetch("/api/triage/session/start", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ deviceId }) }));
    sessionStorage.setItem(storageKey, startedSession.sessionId);
    await loadSession(startedSession.sessionId);
  }, [loadSession]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const storedSessionId = sessionStorage.getItem(storageKey);
        if (storedSessionId) {
          const storedSession = await loadSession(storedSessionId);
          if (storedSession.status === "ACTIVE") return;
          sessionStorage.removeItem(storageKey);
        }
        await startCollection();
      } catch { setScreenState("ERROR"); }
    })();
  }, [loadSession, startCollection]);

  useEffect(() => {
    if (!session || session.status !== "ACTIVE") return;
    let disposed = false;
    const poll = async () => {
      try {
        const current = await loadSession(session.sessionId);
        if (current.status !== "ACTIVE") sessionStorage.removeItem(storageKey);
      } catch { if (!disposed) setScreenState("ERROR"); }
    };
    const interval = window.setInterval(() => { void poll(); }, pollingIntervalMs);
    return () => { disposed = true; window.clearInterval(interval); };
  }, [loadSession, session]);

  const cancelCollection = async () => {
    if (!session || session.status !== "ACTIVE") return;
    setIsCancelling(true);
    try {
      const cancelled = await responseJson<{ status: CollectionStatus }>(await fetch("/api/triage/session/cancel", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify({ sessionId: session.sessionId }) }));
      setSession((current) => current ? { ...current, status: cancelled.status, cancelledAt: new Date().toISOString() } : current);
      sessionStorage.removeItem(storageKey);
      setScreenState("CANCELLED");
    } catch { setScreenState("ERROR"); } finally { setIsCancelling(false); }
  };

  const restartCollection = async () => {
    sessionStorage.removeItem(storageKey);
    setSession(null);
    try { await startCollection(); } catch { setScreenState("ERROR"); }
  };

  const latestFromSession = useMemo(() => latestReading(session), [session]);
  const latest = useMemo(() => session?.readings.find((reading) => reading.readingId === selectedReadingId) ?? latestFromSession, [selectedReadingId, latestFromSession, session]);
  const copy: Record<ScreenState, { title: string; description: string; indicator: "development" | "ready" | "unavailable" }> = {
    STARTING: { title: "Preparando a coleta", description: "Estamos conectando o equipamento para iniciar a medição.", indicator: "development" },
    WAITING: { title: "Aguardando a coleta", description: "Siga as orientações do equipamento para iniciar a medição.", indicator: "development" },
    MEASURING: { title: "Coleta em andamento", description: "Os valores recebidos aparecem abaixo conforme a medição avança.", indicator: "development" },
    COMPLETED: { title: "Coleta concluída", description: "Os valores foram recebidos. Aguarde a próxima orientação para seguir o atendimento.", indicator: "ready" },
    CANCELLED: { title: "Coleta cancelada", description: "A medição foi interrompida. Você pode iniciar uma nova coleta quando estiver pronto.", indicator: "unavailable" },
    ERROR: { title: "Não foi possível acompanhar a coleta", description: "Verifique o equipamento e tente novamente em alguns instantes.", indicator: "unavailable" },
  };
  const currentCopy = copy[screenState];
  const acceptanceControls = screenState === "COMPLETED" && session && session.readings.length > 0
    ? <form action={acceptReading} className="space-y-3"><input type="hidden" name="deviceCollectionSessionId" value={session.sessionId} /><label className="block text-sm font-medium text-foreground">Selecione a leitura que deseja confirmar<select className="mt-1 block min-h-11 w-full rounded-md border border-border bg-surface px-3 text-foreground" name="readingId" onChange={(event) => { setSelectedReadingId(event.target.value); }} required value={selectedReadingId}><option value="">Selecione uma leitura</option>{session.readings.map((reading, index) => <option key={reading.readingId} value={reading.readingId}>Leitura {index + 1}</option>)}</select></label><button className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-contrast disabled:opacity-60" disabled={isAccepting || !selectedReadingId} type="submit">{isAccepting ? "Confirmando coleta…" : "Confirmar coleta"}</button>{acceptanceState.message && <p aria-live="polite" className="text-sm text-danger">{acceptanceState.message}</p>}</form>
    : null;

  return <div className="space-y-5"><section aria-live="polite" className="rounded-lg border border-border bg-surface p-5 shadow-soft"><div className="flex flex-wrap items-start justify-between gap-4"><div><h2 className="text-xl font-semibold">{currentCopy.title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">{currentCopy.description}</p></div><StatusIndicator status={currentCopy.indicator} label={screenState === "MEASURING" ? "Medindo" : undefined} /></div>{(screenState === "STARTING" || screenState === "WAITING" || screenState === "MEASURING") && <div className="mt-5 flex items-center gap-3 rounded-md bg-secondary p-4 text-sm text-text-secondary"><Icon name="pulse" className="text-primary" /><span>Permaneça próximo ao equipamento durante a coleta.</span></div>}</section><section aria-label="Valores recebidos" className="grid gap-3 sm:grid-cols-3"><ReadingValue label="Frequência cardíaca" unit="bpm" value={latest?.bpm ?? null} /><ReadingValue label="Saturação de oxigênio" unit="%" value={latest?.spo2 ?? null} /><ReadingValue label="Temperatura" unit="°C" value={latest?.temperatura ?? null} /></section>{acceptanceControls}{session?.status === "ACTIVE" && <button className="min-h-11 rounded-md border border-danger px-4 text-sm font-semibold text-danger transition-colors hover:bg-danger/10 disabled:opacity-60" disabled={isCancelling} onClick={() => { void cancelCollection(); }} type="button">{isCancelling ? "Cancelando…" : "Cancelar coleta"}</button>}{(screenState === "CANCELLED" || screenState === "ERROR") && <button className="min-h-11 rounded-md bg-primary px-4 text-sm font-semibold text-primary-contrast disabled:opacity-60" disabled={isCancelling} onClick={() => { void restartCollection(); }} type="button">Tentar nova coleta</button>}</div>;
}

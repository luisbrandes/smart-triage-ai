"use client";

import { useActionState, useEffect } from "react";

import { callNextAction, completeCareAction, startCareAction, type CareActionState } from "@/app/enfermagem/atendimento/actions";
import { Icon } from "@/shared/ui/icon";

const initial: CareActionState = { success: false, message: "" };

function announce(ticket: string) {
  const context = new AudioContext();
  [0, 0.18].forEach((offset) => {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = 880;
    gain.gain.setValueAtTime(0.12, context.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + offset + 0.14);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(context.currentTime + offset);
    oscillator.stop(context.currentTime + offset + 0.15);
  });
  window.setTimeout(() => {
    const synthesis = window.speechSynthesis;
    if (!synthesis) return;
    const announcement = new SpeechSynthesisUtterance(`Senha ${ticket.replaceAll("-", " ")}. Por favor, dirigir-se ao atendimento.`);
    announcement.lang = "pt-BR";
    announcement.rate = 0.9;
    announcement.pitch = 1;
    const voices = synthesis.getVoices();
    const feminineVoiceNames = ["luciana", "francisca", "maria", "joana", "vitória", "vitoria", "fernanda", "helena"];
    announcement.voice = voices.find((voice) => voice.lang.toLowerCase().startsWith("pt") && feminineVoiceNames.some((name) => voice.name.toLowerCase().includes(name))) ?? voices.find((voice) => voice.lang.toLowerCase() === "pt-br") ?? voices.find((voice) => voice.lang.toLowerCase().startsWith("pt")) ?? null;
    synthesis.cancel();
    synthesis.speak(announcement);
  }, 400);
}

export function CallNextButton() {
  const [state, action, pending] = useActionState(callNextAction, initial);
  useEffect(() => { if (state.success && state.status === "CALLED" && state.ticketCode) announce(state.ticketCode); }, [state]);
  const message = "message" in state ? state.message : state.success && state.ticketCode ? `Senha ${state.ticketCode} chamada.` : "";
  return <form action={action}><button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-md bg-primary px-5 font-semibold text-primary-contrast disabled:opacity-60 sm:w-auto" disabled={pending}><Icon name="activity" size={18} />{pending ? "Selecionando…" : "Chamar próxima senha"}</button>{message && <p className={`mt-3 text-sm ${state.success ? "text-success" : "text-danger"}`} role="status">{message}</p>}</form>;
}

export function CareStatusAction({ triageId, status }: { triageId: string; status: "CALLED" | "IN_SERVICE" | "COMPLETED" }) {
  const action = status === "CALLED" ? startCareAction.bind(null, triageId) : completeCareAction.bind(null, triageId);
  const [state, formAction, pending] = useActionState(action, initial);
  const error = !state.success && "message" in state ? state.message : "";
  return <form action={formAction}><button className="min-h-10 rounded-md bg-primary px-4 text-sm font-semibold text-primary-contrast disabled:opacity-60" disabled={pending}>{pending ? "Processando…" : status === "CALLED" ? "Iniciar atendimento" : "Concluir atendimento"}</button>{error && <p className="mt-2 text-xs text-danger">{error}</p>}</form>;
}

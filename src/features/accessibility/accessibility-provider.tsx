"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { accessibilityStorageKey, defaultAccessibilityPreferences, parseAccessibilityPreferences, type AccessibilityPreferences, type ColorMode, type FontScale, type TextSpacing } from "@/features/accessibility/accessibility-preferences";
import { Icon } from "@/shared/ui/icon";

type AccessibilityContextValue = { open: boolean; openPanel: () => void; closePanel: () => void };
const AccessibilityContext = createContext<AccessibilityContextValue | null>(null);

function speak(text: string) {
  if (!("speechSynthesis" in window) || !text.trim()) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text.trim().slice(0, 4000));
  utterance.lang = "pt-BR";
  utterance.rate = 0.9;
  window.speechSynthesis.speak(utterance);
}

function Toggle({ checked, label, description, onChange }: { checked: boolean; label: string; description: string; onChange: (value: boolean) => void }) {
  return <label className="flex min-h-14 cursor-pointer items-start justify-between gap-4 rounded-md border border-border p-3"><span><strong className="block text-sm">{label}</strong><span className="mt-1 block text-xs leading-5 text-text-secondary">{description}</span></span><input className="mt-1 size-5 accent-primary" type="checkbox" checked={checked} onChange={(event) => { onChange(event.target.checked); }} /></label>;
}

function Choice<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: ReadonlyArray<{ value: T; label: string }>; onChange: (value: T) => void }) {
  return <label className="block text-sm font-semibold">{label}<select className="mt-2 min-h-11 w-full rounded-md border border-border bg-surface px-3 font-normal text-foreground" value={value} onChange={(event) => { onChange(event.target.value as T); }}>{options.map((option) => <option value={option.value} key={option.value}>{option.label}</option>)}</select></label>;
}

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [preferences, setPreferences] = useState(defaultAccessibilityPreferences);
  const [ready, setReady] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);

  const openPanel = useCallback(() => { previousFocus.current = document.activeElement as HTMLElement | null; setOpen(true); }, []);
  const closePanel = useCallback(() => { setOpen(false); window.speechSynthesis?.cancel(); queueMicrotask(() => previousFocus.current?.focus()); }, []);
  const update = <K extends keyof AccessibilityPreferences,>(key: K, value: AccessibilityPreferences[K]) => setPreferences((current) => ({ ...current, [key]: value }));

  useEffect(() => {
    let active = true;
    queueMicrotask(() => {
      if (!active) return;
      setPreferences(parseAccessibilityPreferences(localStorage.getItem(accessibilityStorageKey)));
      setReady(true);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!ready) return;
    localStorage.setItem(accessibilityStorageKey, JSON.stringify(preferences));
    const root = document.documentElement;
    root.dataset.a11yColor = preferences.colorMode;
    root.dataset.a11yFont = preferences.fontScale;
    root.dataset.a11ySpacing = preferences.textSpacing;
    root.dataset.a11yMotion = preferences.reduceMotion ? "reduced" : "default";
    root.dataset.a11ySimple = preferences.simplifiedReading ? "true" : "false";
  }, [preferences, ready]);
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === "a") { event.preventDefault(); openPanel(); }
      if (event.altKey && event.key.toLowerCase() === "l") { event.preventDefault(); speak(document.querySelector("main")?.textContent ?? ""); }
      if (event.key === "Escape" && open) closePanel();
    };
    window.addEventListener("keydown", shortcut);
    return () => window.removeEventListener("keydown", shortcut);
  }, [closePanel, open, openPanel]);
  useEffect(() => {
    if (!preferences.focusNarration) return;
    let timer: number | undefined;
    const announce = (target: EventTarget | null) => {
      const element = target instanceof Element ? target.closest("button, a, label, h1, h2, h3, p, li, [data-speak]") : null;
      const text = element?.getAttribute("aria-label") ?? element?.textContent ?? "";
      window.clearTimeout(timer);
      timer = window.setTimeout(() => speak(text), 250);
    };
    const focus = (event: FocusEvent) => announce(event.target);
    const hover = (event: MouseEvent) => announce(event.target);
    document.addEventListener("focusin", focus);
    document.addEventListener("mouseover", hover);
    return () => { window.clearTimeout(timer); document.removeEventListener("focusin", focus); document.removeEventListener("mouseover", hover); window.speechSynthesis?.cancel(); };
  }, [preferences.focusNarration]);

  return <AccessibilityContext.Provider value={{ open, openPanel, closePanel }}>
    <a className="skip-link" href="#conteudo-principal">Pular para o conteúdo principal</a>
    {children}
    <dialog aria-labelledby="accessibility-title" className="accessibility-dialog m-auto w-[calc(100%_-_2rem)] max-w-2xl rounded-lg border border-border bg-surface p-0 text-foreground shadow-raised" id="accessibility-settings" onCancel={(event) => { event.preventDefault(); closePanel(); }} ref={dialogRef}>
      <div className="max-h-[85vh] overflow-y-auto p-5 sm:p-6">
        <header className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-primary">Preferências pessoais</p><h2 className="mt-1 text-2xl font-semibold" id="accessibility-title">Configurações de acessibilidade</h2><p className="mt-2 text-sm leading-6 text-text-secondary">Combine os recursos que ajudam você. As escolhas ficam somente neste navegador.</p></div><button aria-label="Fechar configurações de acessibilidade" className="grid min-h-11 min-w-11 place-items-center rounded-md border border-border" onClick={closePanel} type="button"><Icon name="close" /></button></header>
        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <fieldset className="space-y-4"><legend className="mb-3 text-lg font-semibold">Visão e cores</legend><Choice<ColorMode> label="Cores e contraste" value={preferences.colorMode} onChange={(value) => update("colorMode", value)} options={[{ value: "default", label: "Padrão" }, { value: "high-contrast", label: "Alto contraste" }, { value: "grayscale", label: "Escala de cinza" }, { value: "protanopia", label: "Ajuste para protanopia" }, { value: "deuteranopia", label: "Ajuste para deuteranopia" }, { value: "tritanopia", label: "Ajuste para tritanopia" }]} /><Choice<FontScale> label="Tamanho do texto" value={preferences.fontScale} onChange={(value) => update("fontScale", value)} options={[{ value: "100", label: "Normal — 100%" }, { value: "115", label: "Maior — 115%" }, { value: "130", label: "Grande — 130%" }, { value: "150", label: "Muito grande — 150%" }]} /></fieldset>
          <fieldset className="space-y-4"><legend className="mb-3 text-lg font-semibold">Leitura e compreensão</legend><Choice<TextSpacing> label="Espaçamento do texto" value={preferences.textSpacing} onChange={(value) => update("textSpacing", value)} options={[{ value: "default", label: "Padrão" }, { value: "comfortable", label: "Confortável" }, { value: "wide", label: "Amplo" }]} /><Toggle checked={preferences.simplifiedReading} label="Modo de leitura simples" description="Destaca títulos e limita a largura das linhas para reduzir sobrecarga visual." onChange={(value) => update("simplifiedReading", value)} /></fieldset>
          <fieldset className="space-y-3"><legend className="mb-3 text-lg font-semibold">Áudio</legend><Toggle checked={preferences.focusNarration} label="Ler ao focar ou apontar" description="Usa a voz do navegador para ler elementos em foco ou sob o mouse." onChange={(value) => update("focusNarration", value)} /><div className="flex flex-wrap gap-2"><button className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold" onClick={() => speak(document.querySelector("main")?.textContent ?? "")} type="button"><Icon className="mr-2 inline" name="volume" size={17} />Ler página</button><button className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold" onClick={() => window.speechSynthesis?.cancel()} type="button">Parar áudio</button></div></fieldset>
          <fieldset className="space-y-3"><legend className="mb-3 text-lg font-semibold">Conforto</legend><Toggle checked={preferences.reduceMotion} label="Reduzir movimentos" description="Desativa animações e rolagem suave sempre que possível." onChange={(value) => update("reduceMotion", value)} /><p className="rounded-md bg-secondary p-3 text-xs leading-5 text-text-secondary"><strong className="text-foreground">Atalhos:</strong> Alt+A abre este painel; Alt+L lê a página; Esc fecha.</p></fieldset>
        </div>
        <footer className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4"><p aria-live="polite" className="text-xs text-text-muted">Preferências salvas automaticamente.</p><button className="min-h-11 rounded-md border border-border px-4 text-sm font-semibold" onClick={() => setPreferences(defaultAccessibilityPreferences)} type="button"><Icon className="mr-2 inline" name="reset" size={17} />Restaurar padrão</button></footer>
      </div>
    </dialog>
  </AccessibilityContext.Provider>;
}

export function AccessibilityButton() {
  const context = useContext(AccessibilityContext);
  if (!context) return null;
  return <button aria-controls="accessibility-settings" aria-expanded={context.open} aria-label={`${context.open ? "Fechar" : "Abrir"} configurações de acessibilidade`} className="flex min-h-11 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-semibold" onClick={context.openPanel} type="button"><Icon name="accessibility" size={19} /><span className="hidden sm:inline">Acessibilidade</span></button>;
}

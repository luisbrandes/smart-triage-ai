import type { AiEvidenceItem, AiSuggestionView } from "@/server/application/ai-suggestion/ai-suggestion-types";
import type { NursingPriority } from "@/server/application/nursing/nursing-types";
import { Badge } from "@/shared/ui/badge";
import { Icon, type IconName } from "@/shared/ui/icon";

const priorityLabels = { RED: "Vermelha", YELLOW: "Amarela", GREEN: "Verde", BLUE: "Azul" } as const;
const priorityVariants = { RED: "danger", YELLOW: "warning", GREEN: "success", BLUE: "info" } as const;
const attentionLabels = { HIGH: "Alta", MODERATE: "Moderada", LOW: "Baixa" } as const;
const evidenceIcons: Record<string, IconName> = {
  ageYears: "patient", sex: "patient", mainComplaint: "clipboard",
  subjectiveIntensity: "activity", approximateDuration: "clock", reportedAlerts: "alert",
  bpm: "pulse", spo2: "activity", temperature: "activity", weight: "patient",
  height: "patient", systemPriority: "review",
};

function EvidenceCard({ item, highlighted = false }: { item: AiEvidenceItem; highlighted?: boolean }) {
  return <div className={`min-w-0 rounded-md border p-3 ${highlighted ? "border-primary/20 bg-secondary/40" : "border-border bg-surface"}`}>
    <dt className="flex items-center gap-2 text-xs font-medium text-text-secondary">
      <Icon name={evidenceIcons[item.key] ?? "info"} size={16} className="shrink-0 text-primary" />{item.label}
    </dt>
    <dd className="mt-2 break-words text-sm font-semibold leading-6">{item.value}</dd>
  </div>;
}

export function AiSuggestionResultCard({ suggestion, systemPriority }: { suggestion: AiSuggestionView; systemPriority: NursingPriority }) {
  if (suggestion.status !== "COMPLETED" || !suggestion.suggestedPriority) return null;
  const profile = suggestion.dataConsidered.filter((item) => ["ageYears", "sex"].includes(item.key));
  const generatedAt = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(suggestion.createdAt);
  return (
    <section className="overflow-hidden rounded-lg border border-primary/25 bg-surface shadow-soft" aria-label="Resultado da sugestão experimental da IA">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-primary/15 bg-secondary/50 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-contrast"><Icon name="sparkle" size={23} /></span>
          <h2 className="text-lg font-semibold">Sugestão da IA</h2>
        </div>
        <Badge variant="info">Experimental</Badge>
      </header>
      <div className="space-y-6 p-5 sm:p-6">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <div className="rounded-md border border-primary/20 bg-surface-raised p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-text-secondary">Prioridade sugerida</p>
            <div className="mt-3"><Badge variant={priorityVariants[suggestion.suggestedPriority]}>{priorityLabels[suggestion.suggestedPriority]}</Badge></div>
            {suggestion.attentionLevel && <p className="mt-3 text-sm text-text-secondary">Atenção: <strong className="text-foreground">{attentionLabels[suggestion.attentionLevel]}</strong></p>}
          </div>
          <div className="min-w-0 rounded-md border border-border p-4">
            <h4 className="flex items-center gap-2 text-sm font-semibold"><Icon name="sparkle" size={17} className="text-primary" />Resumo da sugestão</h4>
            <p className="mt-2 break-words text-sm leading-7 text-text-secondary">{suggestion.summary || "Resumo não registrado para esta sugestão."}</p>
            <div className="mt-3 flex items-start gap-2 border-t border-border pt-3 text-xs leading-5 text-text-secondary">
              <Icon name="review" size={16} className="mt-0.5 shrink-0" />
              <p>Sistema: <strong>{priorityLabels[systemPriority]}</strong>. {suggestion.suggestedPriority === systemPriority ? "Sugestão coincidente." : "Sugestão diferente da recomendação do sistema."}</p>
            </div>
          </div>
        </div>
        {profile.length > 0 && <div>
          <h4 className="text-sm font-semibold">Perfil enviado</h4>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2">{profile.map((item) => <EvidenceCard key={item.key} item={item} />)}</dl>
        </div>}
        {suggestion.indicators.length > 0 && <div>
          <h4 className="flex items-center gap-2 text-sm font-semibold"><Icon name="sparkle" size={17} className="text-primary" />Informações destacadas pela IA</h4>
          <dl className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{suggestion.indicators.map((item) => <EvidenceCard key={item.key} item={item} highlighted />)}</dl>
        </div>}
        {suggestion.explanation && <div className="border-l-2 border-primary/40 pl-4">
          <h4 className="text-sm font-semibold">Contexto da sugestão</h4>
          <p className="mt-2 text-sm leading-7 text-text-secondary">{suggestion.explanation}</p>
        </div>}
        <details className="rounded-md border border-border bg-surface-raised">
          <summary className="min-h-11 cursor-pointer rounded-md p-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus">Dados enviados ao Groq <span className="ml-1 text-xs font-normal text-text-secondary">({suggestion.dataConsidered.length})</span></summary>
          <div className="border-t border-border p-4">
            {suggestion.dataConsidered.length > 0 ? <dl className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{suggestion.dataConsidered.map((item) => <EvidenceCard key={item.key} item={item} />)}</dl> : <p className="text-sm text-text-secondary">Os dados enviados não foram registrados para esta sugestão antiga.</p>}
          </div>
        </details>
        <footer className="space-y-3 border-t border-border pt-4">
          <div className="flex items-start gap-2 text-xs leading-5 text-text-secondary"><Icon name="shield" size={17} className="mt-0.5 shrink-0 text-primary" /><p>Apoio experimental, sem alteração automática da classificação. Decisão final da enfermagem.</p></div>
          <details className="text-xs text-text-secondary"><summary className="min-h-11 cursor-pointer py-3 font-medium">Limitações desta sugestão</summary><ul className="list-disc space-y-1 pl-5 leading-5">{(suggestion.limitations.length ? suggestion.limitations : ["Não substitui a avaliação profissional."]).map((item) => <li key={item}>{item}</li>)}</ul></details>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-text-muted"><span className="inline-flex items-center gap-1.5"><Icon name="clock" size={14} /><time dateTime={suggestion.createdAt.toISOString()}>{generatedAt} UTC</time></span><span>Coleta {suggestion.collectionAttemptNumber}</span><span className="break-all">Modelo: {suggestion.model}</span></p>
        </footer>
      </div>
    </section>
  );
}

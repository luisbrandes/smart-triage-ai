"use client";

import { useActionState, useState } from "react";

import { confirmClassificationAction, reclassifyAction, referToCareAction, requestRecollectionAction, type NursingActionState } from "@/app/enfermagem/triagens/[triageId]/actions";
import type { NursingTriageDetailDto } from "@/server/application/nursing/nursing-types";
import { Icon } from "@/shared/ui/icon";

const initialState: NursingActionState = { success: false, message: "" };
type Decision = "confirm" | "reclassify" | "recollect";

function Feedback({ state }: { state: NursingActionState }) {
  if (!state.success && !state.message) return null;
  return <p className={`mt-3 rounded-md border p-3 text-sm ${state.success ? "border-success/20 bg-success/10 text-success" : "border-danger/20 bg-danger/10 text-danger"}`} role="status">{state.success ? "Ação concluída. Os dados da triagem foram atualizados." : state.message}</p>;
}

function SubmitButton({ pending, children }: { pending: boolean; children: string }) {
  return <button className="min-h-12 rounded-md bg-primary px-5 py-2 text-sm font-semibold text-primary-contrast disabled:cursor-wait disabled:opacity-60" disabled={pending} type="submit">{pending ? "Processando…" : children}</button>;
}

const decisionOptions = [
  { value: "confirm", title: "Confirmar prioridade", description: "A avaliação está de acordo com a recomendação.", icon: "check" },
  { value: "reclassify", title: "Alterar prioridade", description: "A avaliação profissional indica outra prioridade.", icon: "review" },
  { value: "recollect", title: "Solicitar nova coleta", description: "Os sinais vitais precisam ser coletados novamente.", icon: "activity" },
] as const;

export function NursingDecisionPanel({ triageId, status, recommendedPriority }: { triageId: string; status: NursingTriageDetailDto["status"]; recommendedPriority: string }) {
  const [decision, setDecision] = useState<Decision>("confirm");
  const [confirmState, confirmAction, confirming] = useActionState(confirmClassificationAction.bind(null, triageId), initialState);
  const [reclassifyState, reclassifyFormAction, reclassifying] = useActionState(reclassifyAction.bind(null, triageId), initialState);
  const [recollectionState, recollectionFormAction, recollecting] = useActionState(requestRecollectionAction.bind(null, triageId), initialState);
  const [referralState, referralFormAction, referring] = useActionState(referToCareAction.bind(null, triageId), initialState);

  if (status === "REFERRED_TO_CARE") return <div className="rounded-md border border-success/20 bg-success/10 p-4 text-sm text-success"><strong>Encaminhamento concluído.</strong> A decisão foi registrada com sucesso.</div>;
  if (status === "CARE_WAITING") return <div className="rounded-md border border-info/20 bg-info/10 p-4 text-sm text-text-secondary"><strong className="text-foreground">Classificação concluída.</strong> O paciente entrou automaticamente na fila de atendimento.</div>;
  if (status === "CALLED") return <div className="rounded-md border border-warning/25 bg-warning/10 p-4 text-sm text-text-secondary"><strong className="text-foreground">Senha chamada.</strong> O atendimento pode ser iniciado pela fila operacional.</div>;
  if (status === "IN_SERVICE") return <div className="rounded-md border border-info/20 bg-info/10 p-4 text-sm text-text-secondary"><strong className="text-foreground">Atendimento em andamento.</strong> A conclusão deve ser registrada pela fila operacional.</div>;
  if (status === "COMPLETED") return <div className="rounded-md border border-success/20 bg-success/10 p-4 text-sm text-success"><strong>Atendimento concluído.</strong> O ciclo operacional desta senha foi finalizado.</div>;
  if (status === "RECOLLECTION_REQUESTED") return <div className="rounded-md border border-warning/25 bg-warning/10 p-4 text-sm text-text-secondary"><strong className="text-foreground">Nova coleta solicitada.</strong> O paciente deve retomar o fluxo de sinais vitais. Uma nova revisão será necessária após a reanálise.</div>;

  if (status === "CLASSIFIED") return <form action={referralFormAction} className="max-w-2xl space-y-4"><div className="rounded-md border border-success/20 bg-success/10 p-4"><h3 className="font-semibold text-success">Classificação concluída</h3><p className="mt-1 text-sm text-text-secondary">Defina o destino do atendimento para avançar esta triagem.</p></div><label className="block text-sm font-medium">Destino opcional<input className="mt-1 min-h-11 w-full rounded-md border border-border bg-surface px-3" maxLength={120} name="destination" /></label><label className="block text-sm font-medium">Observação opcional<textarea className="mt-1 min-h-24 w-full rounded-md border border-border bg-surface p-3" maxLength={500} name="notes" /></label><SubmitButton pending={referring}>Registrar encaminhamento</SubmitButton><Feedback state={referralState} /></form>;

  return (
    <div>
      <p className="mb-3 text-sm font-semibold">Qual decisão você deseja registrar?</p>
      <div aria-label="Tipo de decisão" className="grid gap-3 lg:grid-cols-3" role="radiogroup">
        {decisionOptions.map((option) => {
          const selected = decision === option.value;
          return <button aria-checked={selected} className={`min-h-24 rounded-lg border p-4 text-left transition-colors ${selected ? "border-primary bg-secondary/70 shadow-soft" : "border-border bg-surface hover:border-border-strong"}`} key={option.value} onClick={() => setDecision(option.value)} role="radio" type="button"><span className="flex items-center gap-2 font-semibold"><span className={`grid size-8 place-items-center rounded-full ${selected ? "bg-primary text-primary-contrast" : "bg-surface-raised text-text-muted"}`}><Icon name={option.icon} size={17} /></span>{option.title}</span><span className="mt-2 block text-sm leading-5 text-text-secondary">{option.description}</span></button>;
        })}
      </div>

      <div className="mt-5 rounded-lg border border-border bg-surface-raised p-5">
        {decision === "confirm" && <form action={confirmAction}><h3 className="text-lg font-semibold">Confirmar {recommendedPriority}</h3><p className="mt-2 max-w-2xl text-sm leading-6 text-text-secondary">Registra a recomendação atual como classificação definida pela enfermagem. Revise os dados acima antes de continuar.</p><div className="mt-5"><SubmitButton pending={confirming}>Confirmar classificação</SubmitButton></div><Feedback state={confirmState} /></form>}
        {decision === "reclassify" && <form action={reclassifyFormAction} className="max-w-2xl"><h3 className="text-lg font-semibold">Alterar prioridade</h3><label className="mt-4 block text-sm font-medium">Nova prioridade<select className="mt-1 min-h-11 w-full rounded-md border border-border bg-surface px-3" name="priority" required><option value="GREEN">Verde</option><option value="YELLOW">Amarela</option><option value="RED">Vermelha</option></select></label><label className="mt-4 block text-sm font-medium">Justificativa da decisão<textarea className="mt-1 min-h-24 w-full rounded-md border border-border bg-surface p-3" maxLength={500} minLength={5} name="justification" required /></label><div className="mt-5"><SubmitButton pending={reclassifying}>Salvar nova classificação</SubmitButton></div><Feedback state={reclassifyState} /></form>}
        {decision === "recollect" && <form action={recollectionFormAction} className="max-w-2xl"><h3 className="text-lg font-semibold">Solicitar nova coleta</h3><p className="mt-2 text-sm leading-6 text-text-secondary">A triagem retornará para coleta de sinais vitais e precisará de uma nova revisão.</p><label className="mt-4 block text-sm font-medium">Motivo da nova coleta<textarea className="mt-1 min-h-24 w-full rounded-md border border-border bg-surface p-3" maxLength={300} minLength={3} name="reason" required /></label><div className="mt-5"><SubmitButton pending={recollecting}>Confirmar solicitação</SubmitButton></div><Feedback state={recollectionState} /></form>}
      </div>
    </div>
  );
}

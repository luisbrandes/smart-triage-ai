import { notFound } from "next/navigation";

import { demoAnamnesis } from "@/demo/anamnesis";
import { formatDateTime, originLabels, priorityPresentation } from "@/features/nursing/nursing-presentation";
import { NursingDecisionPanel } from "@/features/nursing/nursing-decision-panel";
import { nursing } from "@/server/nursing";
import { PageContainer } from "@/shared/layout/page-container";
import { Badge } from "@/shared/ui/badge";
import { ButtonLink } from "@/shared/ui/button-link";
import { Card } from "@/shared/ui/card";
import { Icon } from "@/shared/ui/icon";
import { SectionHeading } from "@/shared/ui/section-heading";

export const dynamic = "force-dynamic";

const alertLabels = Object.fromEntries(demoAnamnesis.alertQuestions.map((question) => [question.key, question.label]));
const valueOrNotInformed = (value: string | number | null) => value === null || value === "" ? "Não informado" : String(value);

export default async function NursingTriageDetailPage({ params }: { params: Promise<{ triageId: string }> }) {
  const { triageId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(triageId)) notFound();
  const detail = await nursing.findDetail(triageId);
  if (!detail) notFound();
  const current = priorityPresentation[detail.currentRecommendedPriority];
  const attentionCount = detail.anamnesis.demoAlerts.filter((alert) => alert.answer === "yes").length;
  const statusLabels = { AWAITING_NURSE_REVIEW: "Aguardando revisão", RECOLLECTION_REQUESTED: "Nova coleta solicitada", CLASSIFIED: "Classificada pela enfermagem", REFERRED_TO_CARE: "Encaminhada para atendimento", CARE_WAITING: "Aguardando atendimento", CALLED: "Senha chamada", IN_SERVICE: "Em atendimento", COMPLETED: "Atendimento concluído" } as const;

  return (
    <PageContainer className="py-7 sm:py-9 lg:max-w-none">
      <SectionHeading eyebrow="Revisão da enfermagem" title={`Triagem ${detail.ticketCode}`} description="Informações coletadas e recomendação assistiva organizadas para a decisão profissional." action={<ButtonLink href="/enfermagem" variant="secondary"><Icon name="back" size={17} />Voltar à fila</ButtonLink>} />
      <div className="mt-6 flex flex-wrap gap-2"><Badge variant={current.variant}>{current.label}</Badge><Badge variant="info">{statusLabels[detail.status]}</Badge>{!detail.humanDecision && <Badge variant="warning">Decisão final não realizada</Badge>}</div>
      <div className="mt-6 rounded-md border border-info/20 bg-info/10 p-4 text-sm leading-6 text-text-secondary"><strong className="text-foreground">Apoio à decisão.</strong> A recomendação não é diagnóstico e não substitui a avaliação profissional.</div>

      <section className="mt-6 grid gap-3 rounded-lg border border-border bg-surface p-4 shadow-soft sm:grid-cols-[1fr_auto_auto] sm:items-center" aria-label="Resumo para decisão">
        <div><p className="text-xs font-semibold uppercase tracking-wider text-text-muted">Queixa principal</p><p className="mt-1 text-lg font-semibold">{detail.anamnesis.mainComplaint}</p></div>
        <div className="rounded-md bg-surface-raised px-4 py-3"><p className="text-xs text-text-muted">Intensidade informada</p><p className="mt-1 font-semibold">{valueOrNotInformed(detail.anamnesis.subjectiveIntensity)}</p></div>
        <div className={`rounded-md px-4 py-3 ${attentionCount > 0 ? "bg-danger/10 text-danger" : "bg-success/10 text-success"}`}><p className="text-xs">Sinais de atenção</p><p className="mt-1 font-semibold">{attentionCount > 0 ? `${attentionCount} informado${attentionCount > 1 ? "s" : ""}` : "Nenhum informado"}</p></div>
      </section>

      <div className="mt-6 grid gap-6 xl:grid-cols-2">
        <Card title="Identificação resumida"><dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-text-muted">Nome de exibição</dt><dd className="mt-1 font-semibold">{detail.displayName}</dd></div><div><dt className="text-text-muted">Idade</dt><dd className="mt-1 font-semibold">{detail.ageYears === null ? "Não informada" : `${detail.ageYears} anos`}</dd></div><div><dt className="text-text-muted">Plano de saúde</dt><dd className="mt-1 font-semibold">{detail.healthPlan ?? "Sem plano informado"}</dd></div><div><dt className="text-text-muted">Estado atual</dt><dd className="mt-1 font-semibold">Aguardando revisão da enfermagem</dd></div></dl></Card>
        <Card title="Anamnese"><dl className="grid gap-4 text-sm sm:grid-cols-2"><div className="sm:col-span-2"><dt className="text-text-muted">Queixa principal</dt><dd className="mt-1 font-semibold">{detail.anamnesis.mainComplaint}</dd></div><div className="sm:col-span-2"><dt className="text-text-muted">Descrição complementar</dt><dd className="mt-1">{valueOrNotInformed(detail.anamnesis.additionalDescription)}</dd></div><div><dt className="text-text-muted">Intensidade declarada</dt><dd className="mt-1">{valueOrNotInformed(detail.anamnesis.subjectiveIntensity)}</dd></div><div><dt className="text-text-muted">Início ou duração</dt><dd className="mt-1">{detail.anamnesis.symptomStartedAt ? formatDateTime(detail.anamnesis.symptomStartedAt) : valueOrNotInformed(detail.anamnesis.approximateDuration)}</dd></div><div><dt className="text-text-muted">Alergias declaradas</dt><dd className="mt-1">{valueOrNotInformed(detail.anamnesis.declaredAllergies)}</dd></div><div><dt className="text-text-muted">Medicamentos declarados</dt><dd className="mt-1">{valueOrNotInformed(detail.anamnesis.declaredMedications)}</dd></div><div className="sm:col-span-2"><dt className="text-text-muted">Condições preexistentes</dt><dd className="mt-1">{valueOrNotInformed(detail.anamnesis.declaredPreexistingConditions)}</dd></div></dl></Card>
      </div>

      <Card className="mt-6" title="Decisão profissional" description="A recomendação automática e a classificação humana são registros separados.">
        {detail.humanDecision ? <div className="grid gap-4 sm:grid-cols-3"><div><p className="text-sm text-text-muted">Classificação humana</p><div className="mt-2"><Badge variant={priorityPresentation[detail.humanDecision.priority].variant}>{priorityPresentation[detail.humanDecision.priority].label}</Badge></div></div><div><p className="text-sm text-text-muted">Tipo de decisão</p><p className="mt-2 font-semibold">{detail.humanDecision.decision === "CONFIRMED" ? "Recomendação confirmada" : "Prioridade reclassificada"}</p></div><div><p className="text-sm text-text-muted">Realizada em</p><p className="mt-2 font-semibold">{formatDateTime(detail.humanDecision.reviewedAt)} UTC</p></div>{detail.humanDecision.justification && <div className="sm:col-span-3"><p className="text-sm text-text-muted">Justificativa profissional</p><p className="mt-2 leading-6">{detail.humanDecision.justification}</p></div>}</div> : <p className="text-sm text-text-secondary">Nenhuma classificação humana foi registrada. A prioridade acima continua sendo apenas uma recomendação assistiva.</p>}
        {detail.referral && <div className="mt-5 border-t border-border pt-5"><h3 className="font-semibold">Encaminhamento registrado</h3><p className="mt-2 text-sm text-text-secondary">Destino: {detail.referral.destination ?? "Não informado"}</p>{detail.referral.notes && <p className="mt-1 text-sm text-text-secondary">Observação: {detail.referral.notes}</p>}</div>}
      </Card>

      <Card className="mt-6" title="Registrar decisão" description="Escolha uma única conduta para avançar o atendimento com segurança."><NursingDecisionPanel triageId={triageId} status={detail.status} recommendedPriority={current.label} /></Card>

      <Card className="mt-6" title="Sinais de atenção informados" description="Respostas declaradas pelo paciente para consideração durante a avaliação profissional."><ul className="grid gap-3 lg:grid-cols-3">{detail.anamnesis.demoAlerts.map((alert) => <li className={`rounded-md border p-3 text-sm ${alert.answer === "yes" ? "border-danger/25 bg-danger/10" : "border-border bg-surface-raised"}`} key={alert.questionKey}><p className="leading-6">{alertLabels[alert.questionKey] ?? "Informação de saúde"}</p><Badge variant={alert.answer === "yes" ? "danger" : "neutral"}>{alert.answer === "yes" ? "Informado" : "Não informado"}</Badge></li>)}</ul></Card>

      <Card className="mt-6" title="Recomendação final" description="Resultado consolidado a partir da anamnese e dos sinais vitais."><div className="grid gap-4 lg:grid-cols-2">{detail.analyses.map((analysis) => { const presentation = priorityPresentation[analysis.priority]; return <section className="rounded-md border border-border bg-surface-raised p-4" key={`${analysis.type}-${analysis.executedAt.toISOString()}`}><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">Recomendação final</h3><Badge variant={presentation.variant}>{presentation.label}</Badge></div><p className="mt-2 text-xs text-text-muted">Atualizada em {formatDateTime(analysis.executedAt)} UTC</p><ul className="mt-4 space-y-2 text-sm leading-6 text-text-secondary">{analysis.reasons.map((reason) => <li className="flex gap-2" key={reason}><Icon className="mt-1 shrink-0 text-primary" name="info" size={16} />{reason}</li>)}</ul></section>; })}</div></Card>

      <Card className="mt-6" title="Sinais vitais e coletas" description="Consulte as leituras registradas e a origem de cada coleta.">{detail.collectionAttempts.length === 0 ? <p className="text-sm text-text-secondary">Esta triagem não possui sinais vitais coletados.</p> : <ol className="space-y-4">{detail.collectionAttempts.map((attempt) => <li className="rounded-md border border-border p-4" key={attempt.attemptNumber}><div className="flex flex-wrap justify-between gap-2"><h3 className="font-semibold">Coleta {attempt.attemptNumber} · {originLabels[attempt.origin]}</h3><Badge>{attempt.status}</Badge></div><p className="mt-1 text-xs text-text-muted">Iniciada em {formatDateTime(attempt.startedAt)} UTC</p>{attempt.readings.length > 0 ? <dl className="mt-3 grid gap-3 sm:grid-cols-2">{attempt.readings.map((reading) => <div className="rounded-md bg-surface-raised p-3" key={`${reading.type}-${reading.value}`}><dt className="text-xs text-text-muted">{reading.type === "HEART_RATE" ? "Frequência cardíaca" : "SpO₂"}</dt><dd className="mt-1 font-semibold">{reading.value} {reading.unit} · {reading.accepted ? "aceita" : "não aceita"}</dd></div>)}</dl> : <p className="mt-3 text-sm text-text-secondary">Nenhuma leitura utilizável registrada nesta coleta.</p>}</li>)}</ol>}</Card>

      <Card className="mt-6" title="Linha do tempo resumida" description="Eventos permitidos apresentados sem IDs ou metadados técnicos."><ol className="space-y-3">{detail.timeline.map((event, index) => <li className="flex gap-3" key={`${event.label}-${event.occurredAt.toISOString()}-${index}`}><span className="mt-1 grid size-7 shrink-0 place-items-center rounded-full bg-secondary text-primary"><Icon name="check" size={14} /></span><div><p className="font-semibold">{event.label}</p><p className="text-xs text-text-muted">{formatDateTime(event.occurredAt)} UTC</p></div></li>)}</ol></Card>
      <div className="mt-6 rounded-md border border-warning/25 bg-warning/10 p-4 text-sm leading-6 text-text-secondary"><strong className="text-foreground">Continuidade do cuidado.</strong> O encaminhamento registra o próximo destino, mas não substitui os processos assistenciais da unidade.</div>
    </PageContainer>
  );
}

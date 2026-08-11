import Link from "next/link";

import { OperationalIndicators } from "@/features/nurse-shell/components/operational-indicators";
import { formatDateTime, formatWait, priorityPresentation } from "@/features/nursing/nursing-presentation";
import { nursing } from "@/server/nursing";
import { publicNavigation } from "@/shared/config/navigation";
import { PageContainer } from "@/shared/layout/page-container";
import { Badge } from "@/shared/ui/badge";
import { ButtonLink } from "@/shared/ui/button-link";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { Icon } from "@/shared/ui/icon";
import { SectionHeading } from "@/shared/ui/section-heading";

export const dynamic = "force-dynamic";

export default async function NursingPage() {
  const queue = await nursing.listQueue();
  return (
    <PageContainer className="py-7 sm:py-9 lg:max-w-none">
      <SectionHeading eyebrow="Visão operacional" title="Triagens aguardando revisão" description="Recomendações assistivas organizadas por prioridade e tempo de espera para apoiar a avaliação profissional." action={<div className="flex gap-2"><ButtonLink href="/enfermagem" variant="secondary"><Icon name="activity" size={17} />Atualizar fila</ButtonLink><ButtonLink href={publicNavigation.home.href} variant="ghost"><Icon name="home" size={17} />Início</ButtonLink></div>} />
      <div className="mt-7"><OperationalIndicators values={{ awaitingReview: queue.indicators.awaitingReview, elevatedPriority: queue.indicators.elevatedPriority, withVitalSigns: queue.indicators.withVitalSigns, oldestWait: queue.indicators.oldestWaitingMinutes === null ? "—" : formatWait(queue.indicators.oldestWaitingMinutes) }} /></div>
      <Card className="mt-6" title="Fila de triagens" description="Vermelha, amarela e verde; dentro da mesma recomendação, a entrada mais antiga aparece primeiro." actions={<Badge variant="info">Somente leitura</Badge>}>
        {queue.items.length === 0 ? <EmptyState icon="queue" title="Nenhuma triagem aguardando revisão" description="As triagens concluídas pelo paciente aparecerão aqui para avaliação da enfermagem." action={<ButtonLink href="/paciente" variant="secondary">Abrir painel do paciente<Icon name="arrowRight" size={17} /></ButtonLink>} /> : (
          <ul className="divide-y divide-border">
            {queue.items.map((item) => {
              const priority = priorityPresentation[item.recommendedPriority];
              return <li className="py-4 first:pt-0 last:pb-0" key={item.triageId}><Link className="block rounded-md border border-border bg-surface-raised p-4 transition-colors hover:border-border-strong" href={`/enfermagem/triagens/${item.triageId}`}><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="flex flex-wrap items-center gap-2"><strong className="text-lg">{item.ticketCode}</strong><Badge variant={priority.variant}>{priority.label}</Badge>{item.hasDemoAlert && <Badge variant="danger">Sinal de atenção</Badge>}</div><p className="mt-2 font-semibold">{item.displayName}{item.ageYears === null ? "" : `, ${item.ageYears} anos`}</p><p className="mt-1 text-sm text-text-secondary">{item.mainComplaint}</p></div><span className="inline-flex items-center gap-2 text-sm font-semibold text-primary">Abrir detalhes<Icon name="arrowRight" size={17} /></span></div><dl className="mt-4 grid gap-3 border-t border-border pt-3 text-sm sm:grid-cols-3"><div><dt className="text-text-muted">Espera</dt><dd className="mt-1 font-semibold">{formatWait(item.waitingMinutes)}</dd></div><div><dt className="text-text-muted">Sinais vitais</dt><dd className="mt-1 font-semibold">{item.hasVitalSigns ? "Coletados" : "Não coletados"}</dd></div><div><dt className="text-text-muted">Entrada na fila</dt><dd className="mt-1 font-semibold">{formatDateTime(item.enteredQueueAt)} UTC</dd></div></dl></Link></li>;
            })}
          </ul>
        )}
      </Card>
      <p className="mt-5 text-sm leading-6 text-text-muted">As recomendações apoiam a organização da fila e não substituem a avaliação profissional.</p>
    </PageContainer>
  );
}

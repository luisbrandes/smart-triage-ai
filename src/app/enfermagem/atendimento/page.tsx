import Link from "next/link";

import { CallNextButton, CareStatusAction } from "@/features/nursing/care-actions";
import { formatDateTime, priorityPresentation } from "@/features/nursing/nursing-presentation";
import { nursing } from "@/server/nursing";
import { PageContainer } from "@/shared/layout/page-container";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";
import { EmptyState } from "@/shared/ui/empty-state";
import { SectionHeading } from "@/shared/ui/section-heading";

export const dynamic = "force-dynamic";

const statusCopy = { WAITING: "Aguardando", CALLED: "Senha chamada", IN_SERVICE: "Em atendimento", COMPLETED: "Concluído" } as const;

export default async function CareQueuePage() {
  const items = await nursing.listCareQueue();
  const active = items.filter((item) => item.status !== "COMPLETED");
  const completed = items.filter((item) => item.status === "COMPLETED");
  const waiting = active.filter((item) => item.status === "WAITING").length;
  const called = items.filter((item) => item.status !== "WAITING").length;
  const inService = active.filter((item) => item.status === "IN_SERVICE").length;
  return <PageContainer className="py-6 sm:py-9 lg:max-w-none"><SectionHeading eyebrow="Operação assistencial" title="Fila de atendimento" description="Chame a próxima senha pela prioridade definida na triagem e acompanhe o atendimento até a conclusão." action={<CallNextButton />} />
    <div className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-4"><div className="rounded-lg border border-border bg-surface p-3 shadow-soft sm:p-4"><p className="text-xs text-text-muted sm:text-sm">Aguardando</p><p className="mt-1 text-2xl font-semibold">{waiting}</p></div><div className="rounded-lg border border-border bg-surface p-3 shadow-soft sm:p-4"><p className="text-xs text-text-muted sm:text-sm">JÃ¡ chamados</p><p className="mt-1 text-2xl font-semibold">{called}</p></div><div className="rounded-lg border border-border bg-surface p-3 shadow-soft sm:p-4"><p className="text-xs text-text-muted sm:text-sm">Em atendimento</p><p className="mt-1 text-2xl font-semibold">{inService}</p></div><div className="rounded-lg border border-border bg-surface p-3 shadow-soft sm:p-4"><p className="text-xs text-text-muted sm:text-sm">ConcluÃ­dos</p><p className="mt-1 text-2xl font-semibold">{completed.length}</p></div></div>
    <Card className="mt-5" title="Operação atual" description="A maior prioridade é chamada primeiro; em caso de empate, prevalece quem aguarda há mais tempo.">{active.length === 0 ? <EmptyState icon="queue" title="Nenhum paciente na fila de atendimento" description="Após a classificação da enfermagem, os pacientes aparecerão aqui automaticamente." /> : <ul className="divide-y divide-border">{active.map((item) => { const priority = priorityPresentation[item.priority]; return <li className="py-4 first:pt-0 last:pb-0" key={item.triageId}><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><Link className="min-w-0 flex-1" href={`/enfermagem/triagens/${item.triageId}`}><div className="flex flex-wrap items-center gap-2"><strong className="text-lg">{item.ticketCode}</strong><Badge variant={priority.variant}>{priority.label}</Badge><Badge variant={item.status === "WAITING" ? "neutral" : item.status === "CALLED" ? "warning" : "info"}>{statusCopy[item.status]}</Badge></div><p className="mt-2 font-semibold">{item.displayName}{item.ageYears === null ? "" : `, ${item.ageYears} anos`}</p><p className="mt-1 text-xs text-text-muted">Na fila desde {formatDateTime(item.queuedAt)} UTC</p></Link>{item.status !== "WAITING" && <CareStatusAction status={item.status} triageId={item.triageId} />}</div></li>; })}</ul>}</Card>
    <Card className="mt-5" title="Atendimentos concluídos" description="Histórico recente das senhas finalizadas.">{completed.length === 0 ? <p className="text-sm text-text-muted">Nenhum atendimento concluído.</p> : <ul className="divide-y divide-border">{completed.map((item) => <li className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0" key={item.triageId}><Link className="min-w-0" href={`/enfermagem/triagens/${item.triageId}`}><strong>{item.ticketCode}</strong><p className="truncate text-sm text-text-secondary">{item.displayName}</p></Link><span className="shrink-0 text-xs text-text-muted">{item.completedAt ? formatDateTime(item.completedAt) : "Concluído"}</span></li>)}</ul>}</Card>
  </PageContainer>;
}

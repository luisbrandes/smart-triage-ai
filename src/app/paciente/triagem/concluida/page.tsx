import { redirect } from "next/navigation";

import { PatientSteps } from "@/features/patient-shell/components/patient-steps";
import { resolvePatientIntakeSession } from "@/server/resolve-patient-intake";
import { publicNavigation } from "@/shared/config/navigation";
import { PageContainer } from "@/shared/layout/page-container";
import { Badge } from "@/shared/ui/badge";
import { ButtonLink } from "@/shared/ui/button-link";
import { Card } from "@/shared/ui/card";
import { presentAnalysisReason } from "@/shared/presentation/analysis-copy";
import { Icon } from "@/shared/ui/icon";
import { routeForPatientIntakeStatus } from "@/server/application/patient-intake/patient-intake-routes";
import { vitalSigns } from "@/server/vital-signs";
import { queueTicket } from "@/server/queue-ticket";
import { requestPatientRecollectionAction, startNewDemoTriageAction } from "@/app/paciente/triagem/actions";

const priorityPresentation = {
  GREEN: { label: "Verde — menor prioridade", badge: "success" as const },
  YELLOW: { label: "Amarelo — prioridade intermediária", badge: "warning" as const },
  RED: { label: "Vermelho — maior prioridade", badge: "danger" as const },
};

export default async function CompletedPage() {
  const session = await resolvePatientIntakeSession();
  if (!session) redirect("/paciente");
  const supportedStatuses = ["AWAITING_NURSE_REVIEW", "CLASSIFIED", "REFERRED_TO_CARE", "CARE_WAITING", "CALLED", "IN_SERVICE", "COMPLETED"];
  if (!supportedStatuses.includes(session.status)) redirect(routeForPatientIntakeStatus(session.status, Boolean(session.patientId)));
  const analysis = await vitalSigns.findLatestFinal(session.triageId);
  const ticket = ["AWAITING_NURSE_REVIEW", "CLASSIFIED", "REFERRED_TO_CARE", "CARE_WAITING", "CALLED", "IN_SERVICE", "COMPLETED"].includes(session.status) ? await queueTicket.find(session.triageId) : null;
  const patientStatusMessage = session.status === "CARE_WAITING" ? "Sua triagem foi classificada e você está aguardando ser chamado para atendimento." : session.status === "CALLED" ? "Sua senha foi chamada. Dirija-se ao local de atendimento indicado pela equipe." : session.status === "IN_SERVICE" ? "Seu atendimento está em andamento." : session.status === "COMPLETED" ? "Seu atendimento foi concluído." : "Sua triagem aguarda revisão da enfermagem e a prioridade final ainda não foi confirmada.";

  return (
    <PageContainer className="py-8 sm:py-14">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex flex-wrap justify-center gap-2"><Badge variant="success">Informações recebidas</Badge><Badge variant="info">Revisão humana necessária</Badge></div>
        <PatientSteps currentStep={ticket ? 3 : 2} />
        <Card className="mt-8 text-center" elevated>
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-success/10 text-success"><Icon name="check" size={28} /></span>
          <h1 className="mt-5 text-3xl font-semibold tracking-tight">Triagem concluída e enviada</h1>
          {ticket && (
            <section className="mt-7" aria-labelledby="ticket-title">
              <p className="text-sm font-semibold uppercase tracking-[0.16em] text-text-muted" id="ticket-title">Sua senha operacional</p>
              <p className="mt-2 text-4xl font-bold tracking-wider text-primary sm:text-5xl">{ticket.publicCode}</p>
              <p className="mx-auto mt-3 max-w-xl leading-7 text-text-secondary">Guarde esta senha. {patientStatusMessage}</p>
            </section>
          )}
          {!analysis ? (
            <>
              <p className="mx-auto mt-3 max-w-xl leading-7 text-text-secondary">Suas informações iniciais foram registradas. Agora elas podem ser organizadas em uma análise assistiva.</p>
              <div className="mx-auto mt-6 max-w-xl rounded-md border border-primary/20 bg-secondary/60 p-4 text-sm leading-6 text-text-secondary"><strong className="text-foreground">Tudo pronto para preparar sua análise.</strong> Vamos organizar as informações compartilhadas para apoiar a revisão da equipe de enfermagem.</div>
            </>
          ) : (
            <section className="mt-7 text-left" aria-labelledby="recommendation-title">
              <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-semibold" id="recommendation-title">Recomendação assistiva</h2><Badge variant={priorityPresentation[analysis.recommendedPriority].badge}>{priorityPresentation[analysis.recommendedPriority].label}</Badge></div>
              <ul className="mt-5 space-y-3">{analysis.reasons.map((reason) => <li className="flex gap-3 rounded-md border border-border bg-surface-raised p-3 text-sm leading-6 text-text-secondary" key={reason.code}><Icon className="mt-1 shrink-0 text-primary" name="info" size={17} />{presentAnalysisReason(reason.explanation)}</li>)}</ul>
              <dl className="mt-5 grid gap-3 rounded-md border border-border p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-text-muted">Sinais vitais</dt><dd className="mt-1 font-semibold">Coletados e considerados</dd></div>
                <div><dt className="text-text-muted">Próximo passo</dt><dd className="mt-1 font-semibold">Aguardar revisão da enfermagem</dd></div>
              </dl>
              <div className="mt-5 rounded-md border border-info/20 bg-info/10 p-4 text-sm leading-6 text-text-secondary"><strong className="text-foreground">Validação humana obrigatória.</strong> A enfermagem fará a decisão final; esta recomendação não é diagnóstico nem classificação definitiva.</div>
              {ticket && (
                <div className="mt-5 rounded-md border border-border bg-surface-raised p-4">
                  <h3 className="font-semibold">Etapas concluídas</h3>
                  <ul className="mt-3 grid gap-2 text-sm text-text-secondary sm:grid-cols-2">
                    {["Identificação", "Consentimento", "Anamnese", "Sinais vitais", "Recomendação assistiva", "Aguardando revisão"].map((item) => <li className="flex items-center gap-2" key={item}><Icon className="text-success" name="check" size={16} />{item}</li>)}
                  </ul>
                </div>
              )}
            </section>
          )}
          {session.status === "AWAITING_NURSE_REVIEW" && <form action={requestPatientRecollectionAction} className="mt-7"><button className="min-h-12 rounded-md border border-primary px-5 font-semibold text-primary" type="submit">Fazer nova coleta para esta pessoa</button></form>}
          {ticket ? <form action={startNewDemoTriageAction} className="mt-7"><button className="min-h-12 rounded-md bg-primary px-5 font-semibold text-primary-contrast" type="submit">Iniciar nova triagem</button></form> : <ButtonLink className="mt-7" href={publicNavigation.home.href} variant="secondary">Voltar à página inicial</ButtonLink>}
        </Card>
      </div>
    </PageContainer>
  );
}

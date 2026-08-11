import { PatientSteps } from "@/features/patient-shell/components/patient-steps";
import { publicNavigation } from "@/shared/config/navigation";
import { PageContainer } from "@/shared/layout/page-container";
import { Badge } from "@/shared/ui/badge";
import { ButtonLink } from "@/shared/ui/button-link";
import { Card } from "@/shared/ui/card";
import { Icon } from "@/shared/ui/icon";
import { startDemoTriageAction } from "@/app/paciente/triagem/actions";
import { resolvePatientIntakeSession } from "@/server/resolve-patient-intake";
import { isPatientIntakeResumable } from "@/server/application/patient-intake/patient-intake-routes";

export default async function PatientPage() {
  const existingSession = await resolvePatientIntakeSession();
  const canResume = existingSession ? isPatientIntakeResumable(existingSession.status) : false;
  return (
    <PageContainer className="py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <ButtonLink href={publicNavigation.home.href} variant="ghost"><Icon name="back" size={17} />Voltar ao início</ButtonLink>
          <Badge variant="info">Atendimento inicial</Badge>
        </div>

        <header className="mb-8 max-w-2xl">
          <p className="mb-3 text-sm font-semibold text-primary">Painel do Paciente</p>
          <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Iniciar triagem</h1>
          <p className="mt-3 text-base leading-7 text-text-secondary sm:text-lg">Compartilhe as informações essenciais para que a equipe de enfermagem possa revisar seu atendimento.</p>
        </header>

        <PatientSteps />

        <div className="mt-6 grid gap-4 sm:grid-cols-[1fr_0.8fr]">
          <Card title="O que será solicitado" description="Somente as informações necessárias para apoiar seu atendimento." elevated>
            <ul className="space-y-3 text-sm leading-6 text-text-secondary">
              <li className="flex gap-3"><Icon className="mt-1 shrink-0 text-primary" name="patient" size={17} />Identificação e informações básicas.</li>
              <li className="flex gap-3"><Icon className="mt-1 shrink-0 text-primary" name="clipboard" size={17} />Queixa e respostas estruturadas.</li>
              <li className="flex gap-3"><Icon className="mt-1 shrink-0 text-primary" name="pulse" size={17} />Sinais vitais, somente quando solicitados.</li>
            </ul>
          </Card>
          <Card title="Privacidade desde o início">
            <p className="text-sm leading-6 text-text-secondary">Antes da coleta, você poderá ler o termo de consentimento e entender como as informações serão utilizadas.</p>
            <div className="mt-5 flex items-center gap-2 text-sm font-semibold text-success"><Icon name="shield" size={18} />Coleta de dados essenciais</div>
          </Card>
        </div>

        <div className="mt-6 rounded-lg border border-border bg-surface p-5 text-center shadow-soft">
          <form action={startDemoTriageAction}>
            <button aria-describedby="start-help" className="min-h-12 w-full rounded-md bg-primary px-5 font-semibold text-primary-contrast sm:w-auto" type="submit">{canResume ? "Retomar triagem" : existingSession ? "Iniciar nova triagem" : "Começar triagem"}</button>
          </form>
          <p className="mt-3 text-sm text-text-muted" id="start-help">{canResume ? "Continue de onde parou; suas informações anteriores foram preservadas." : existingSession ? "A triagem anterior continuará disponível para a equipe de enfermagem." : "Você poderá revisar as informações antes de concluir."}</p>
        </div>
      </div>
    </PageContainer>
  );
}

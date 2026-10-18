import { redirect } from "next/navigation";

import { AnamnesisForm } from "@/features/patient-intake/components/anamnesis-form";
import { IntakeBanner } from "@/features/patient-intake/components/intake-banner";
import { PatientSteps } from "@/features/patient-shell/components/patient-steps";
import { resolvePatientIntakeSession } from "@/server/resolve-patient-intake";
import { PageContainer } from "@/shared/layout/page-container";
import { Card } from "@/shared/ui/card";
import { routeForPatientIntakeStatus } from "@/server/application/patient-intake/patient-intake-routes";
import { ButtonLink } from "@/shared/ui/button-link";
import { Icon } from "@/shared/ui/icon";

export default async function AnamnesisPage() {
  const session = await resolvePatientIntakeSession();
  if (!session) redirect("/paciente");
  if (session.status !== "ANAMNESIS_IN_PROGRESS") redirect(routeForPatientIntakeStatus(session.status, Boolean(session.patientId)));

  return (
    <PageContainer className="py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <IntakeBanner />
        <PatientSteps currentStep={1} />
        <header className="my-8"><p className="text-sm font-semibold text-primary">Etapa 2 de 4</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Informações de saúde</h1><p className="mt-2 leading-7 text-text-secondary">Conte o que está sentindo e compartilhe informações importantes para a revisão da enfermagem.</p></header>
        <Card elevated><AnamnesisForm /><div className="mt-6"><ButtonLink href="/paciente/triagem/consentimento" variant="ghost"><Icon name="back" size={17} />Voltar ao consentimento</ButtonLink></div></Card>
      </div>
    </PageContainer>
  );
}

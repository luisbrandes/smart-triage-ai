import { redirect } from "next/navigation";

import { IdentificationForm } from "@/features/patient-intake/components/identification-form";
import { IntakeBanner } from "@/features/patient-intake/components/intake-banner";
import { PatientSteps } from "@/features/patient-shell/components/patient-steps";
import { resolvePatientIntakeSession } from "@/server/resolve-patient-intake";
import { PageContainer } from "@/shared/layout/page-container";
import { Card } from "@/shared/ui/card";
import { routeForPatientIntakeStatus } from "@/server/application/patient-intake/patient-intake-routes";

export default async function IdentificationPage() {
  const session = await resolvePatientIntakeSession();
  if (!session) redirect("/paciente");
  if (session.status !== "IDENTIFICATION_IN_PROGRESS" || session.patientId) redirect(routeForPatientIntakeStatus(session.status, Boolean(session.patientId)));

  return (
    <PageContainer className="py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <IntakeBanner />
        <PatientSteps currentStep={0} />
        <header className="my-8"><p className="text-sm font-semibold text-primary">Etapa 1 de 4</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Identificação</h1><p className="mt-2 leading-7 text-text-secondary">Informe seus dados básicos para iniciar o atendimento.</p></header>
        <Card elevated><IdentificationForm /></Card>
      </div>
    </PageContainer>
  );
}

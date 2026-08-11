import { redirect } from "next/navigation";

import { ConsentForm } from "@/features/patient-intake/components/consent-form";
import { IntakeBanner } from "@/features/patient-intake/components/intake-banner";
import { PatientSteps } from "@/features/patient-shell/components/patient-steps";
import { resolvePatientIntakeSession } from "@/server/resolve-patient-intake";
import { PageContainer } from "@/shared/layout/page-container";
import { Card } from "@/shared/ui/card";
import { routeForPatientIntakeStatus } from "@/server/application/patient-intake/patient-intake-routes";

const consentPresentation = {
  title: "Termo de consentimento para triagem",
  paragraphs: [
    "O Smart Triage registra as informações fornecidas para organizar o atendimento e apoiar a revisão da equipe de enfermagem.",
    "A plataforma não realiza diagnóstico e não substitui a avaliação de profissionais de saúde.",
    "Ao continuar, você confirma que leu este termo e compreendeu como as informações serão utilizadas durante a triagem.",
  ],
} as const;

export default async function ConsentPage() {
  const session = await resolvePatientIntakeSession();
  if (!session) redirect("/paciente");
  if (session.status !== "IDENTIFICATION_IN_PROGRESS" || !session.patientId) redirect(routeForPatientIntakeStatus(session.status, Boolean(session.patientId)));

  return (
    <PageContainer className="py-8 sm:py-12">
      <div className="mx-auto max-w-3xl">
        <IntakeBanner />
        <PatientSteps currentStep={0} />
        <header className="my-8"><p className="text-sm font-semibold text-primary">Consentimento</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Leia antes de continuar</h1><p className="mt-2 leading-7 text-text-secondary">Entenda como as informações serão utilizadas durante a triagem.</p></header>
        <Card elevated title={consentPresentation.title}>
          <div className="space-y-3 text-sm leading-7 text-text-secondary">{consentPresentation.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}</div>
          <ConsentForm />
        </Card>
      </div>
    </PageContainer>
  );
}

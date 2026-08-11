import { redirect } from "next/navigation";

import { prepareFinalAnalysisAction } from "@/app/paciente/triagem/sinais-vitais/actions";
import { IntakeBanner } from "@/features/patient-intake/components/intake-banner";
import { VitalSignsCollectionTabs } from "@/features/patient-intake/components/vital-signs-forms";
import { PatientSteps } from "@/features/patient-shell/components/patient-steps";
import { resolvePatientIntakeSession } from "@/server/resolve-patient-intake";
import { vitalSigns } from "@/server/vital-signs";
import { PageContainer } from "@/shared/layout/page-container";
import { Badge } from "@/shared/ui/badge";
import { Card } from "@/shared/ui/card";

const attemptStatusLabel: Record<string, string> = { COMPLETED: "Coleta concluída", FAILED: "Coleta não concluída" };
const attemptOriginLabel: Record<string, string> = { MANUAL: "Entrada manual", SIMULATED_DEVICE: "Dispositivo integrado" };

export default async function VitalSignsPage() {
  const session = await resolvePatientIntakeSession();
  if (!session || (session.status !== "VITAL_SIGNS_REQUIRED" && session.status !== "VITAL_SIGNS_IN_PROGRESS" && session.status !== "RECOLLECTION_REQUESTED")) redirect("/paciente/triagem/concluida");
  const flow = await vitalSigns.getFlow(session.triageId);

  return (
    <PageContainer className="py-8 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <IntakeBanner />
        <PatientSteps currentStep={2} />
        <header className="my-8"><p className="text-sm font-semibold text-primary">Etapa 3 de 4</p><h1 className="mt-2 text-3xl font-semibold">Sinais vitais</h1><p className="mt-2 text-text-secondary">Registre manualmente ou acompanhe a coleta guiada pelo dispositivo.</p></header>
        <VitalSignsCollectionTabs />
        <Card className="mt-5" title="Coletas realizadas" description="Consulte a origem, o status e os valores recebidos.">
          <div className="space-y-3">
            {flow.attempts.length === 0 ? <p className="text-sm text-text-muted">Nenhuma coleta registrada até o momento.</p> : flow.attempts.map((attempt) => (
              <div className="rounded-lg border border-border bg-surface-raised p-4" key={attempt.id}>
                <div className="flex flex-wrap justify-between gap-2"><strong className="text-sm">Coleta {attempt.attemptNumber} · {attemptOriginLabel[attempt.origin] ?? attempt.origin}</strong><Badge variant={attempt.status === "COMPLETED" ? "success" : "danger"}>{attemptStatusLabel[attempt.status] ?? attempt.status}</Badge></div>
                {attempt.readings.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{attempt.readings.map((item) => <span className="rounded-md bg-surface px-3 py-2 text-sm text-text-secondary" key={item.type}>{item.type === "HEART_RATE" ? "Frequência cardíaca" : "SpO₂"}: <strong className="text-foreground">{item.numericValue} {item.unit}</strong></span>)}</div>}
                {attempt.safeError && <p className="mt-2 text-sm text-danger">Não foi possível concluir: {attempt.safeError}</p>}
              </div>
            ))}
          </div>
          {flow.canConfirm && <form action={prepareFinalAnalysisAction} className="mt-5"><button className="inline-flex min-h-12 w-full items-center justify-center rounded-md bg-primary px-5 font-semibold text-primary-contrast sm:w-auto">Confirmar sinais e continuar</button></form>}
          {flow.attempts.length > 0 && !flow.canConfirm && <p className="mt-5 text-sm text-text-secondary">Tente novamente ou registre os valores manualmente.</p>}
        </Card>
      </div>
    </PageContainer>
  );
}

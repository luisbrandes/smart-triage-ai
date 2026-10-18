import { redirect } from "next/navigation";

import { HardwareCollection } from "@/features/patient-intake/components/hardware-collection";
import { IntakeBanner } from "@/features/patient-intake/components/intake-banner";
import { PatientSteps } from "@/features/patient-shell/components/patient-steps";
import { routeForPatientIntakeStatus } from "@/server/application/patient-intake/patient-intake-routes";
import { resolvePatientIntakeSession } from "@/server/resolve-patient-intake";
import { PageContainer } from "@/shared/layout/page-container";
import { ButtonLink } from "@/shared/ui/button-link";
import { Icon } from "@/shared/ui/icon";

export default async function HardwareCollectionPage() {
  const triage = await resolvePatientIntakeSession();
  if (!triage) redirect("/paciente");
  if (triage.status !== "VITAL_SIGNS_REQUIRED" && triage.status !== "VITAL_SIGNS_IN_PROGRESS" && triage.status !== "RECOLLECTION_REQUESTED") redirect(routeForPatientIntakeStatus(triage.status, Boolean(triage.patientId)));
  const deviceId = process.env.TRIAGE_DEVICE_ID;
  return <PageContainer className="py-8 sm:py-12"><div className="mx-auto max-w-4xl"><IntakeBanner /><PatientSteps currentStep={2} /><header className="my-8"><p className="text-sm font-semibold text-primary">Etapa 3 de 4</p><h1 className="mt-2 text-3xl font-semibold tracking-tight">Coleta de sinais vitais</h1><p className="mt-2 leading-7 text-text-secondary">Acompanhe a coleta orientada pelo equipamento.</p></header>{deviceId ? <HardwareCollection deviceId={deviceId} triageId={triage.triageId} /> : <p className="rounded-lg border border-danger p-4 text-danger">O equipamento de coleta não está configurado neste ambiente.</p>}</div></PageContainer>;
}

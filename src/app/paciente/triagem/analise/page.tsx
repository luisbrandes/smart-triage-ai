import { redirect } from "next/navigation";

import { FinalAnalysisAction } from "@/features/patient-intake/components/final-analysis-action";
import { PatientSteps } from "@/features/patient-shell/components/patient-steps";
import { resolvePatientIntakeSession } from "@/server/resolve-patient-intake";
import { vitalSigns } from "@/server/vital-signs";
import { PageContainer } from "@/shared/layout/page-container";

export default async function PatientAnalysisPage() {
  const session = await resolvePatientIntakeSession();
  if (!session) redirect("/paciente");
  if (session.status !== "VITAL_SIGNS_IN_PROGRESS") redirect("/paciente/triagem/concluida");
  const flow = await vitalSigns.getFlow(session.triageId);
  if (!flow.canConfirm) redirect("/paciente/triagem/sinais-vitais");
  return <PageContainer className="py-8 sm:py-14"><div className="mx-auto max-w-3xl"><PatientSteps currentStep={3} /><FinalAnalysisAction autoStart /></div></PageContainer>;
}

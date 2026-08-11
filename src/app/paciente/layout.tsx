import type { ReactNode } from "react";

import { PatientHeader } from "@/shared/layout/patient-header";
import { PageContainer } from "@/shared/layout/page-container";
import { Icon } from "@/shared/ui/icon";
import { hasPatientAccess } from "@/server/security/patient-access-session";
import { redirect } from "next/navigation";

export default async function PatientLayout({ children }: { children: ReactNode }) {
  if (!(await hasPatientAccess())) redirect("/acesso-paciente");
  return (
    <div className="min-h-screen bg-background">
      <PatientHeader />
      <main>{children}</main>
      <footer className="mt-12 border-t border-border bg-surface py-6">
        <PageContainer className="flex flex-col gap-3 text-xs text-text-muted sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-center gap-2"><Icon name="privacy" size={15} />Privacidade e coleta de dados essenciais.</span>
          <span>Recomendação sujeita à revisão da enfermagem</span>
        </PageContainer>
      </footer>
    </div>
  );
}

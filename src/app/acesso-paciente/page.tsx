import { PatientAccessForm } from "@/features/patient-intake/components/patient-access-form";
import { AppHeader } from "@/shared/layout/app-header";
import { PageContainer } from "@/shared/layout/page-container";
import { Card } from "@/shared/ui/card";
import { Icon } from "@/shared/ui/icon";

export default function PatientAccessPage() {
  return <><AppHeader /><main id="conteudo-principal"><PageContainer className="py-12 sm:py-20"><Card className="mx-auto max-w-md" elevated header={<span className="mb-4 grid size-11 place-items-center rounded-md bg-secondary text-primary"><Icon name="patient" size={22} /></span>} title="Acesso ao painel do paciente" description="Informe a credencial compartilhada com o time autorizado para iniciar os testes."><PatientAccessForm /><p className="mt-5 flex gap-2 border-t border-border pt-4 text-xs leading-5 text-text-muted"><Icon className="shrink-0" name="shield" size={16} />A sessão é protegida, expira automaticamente e não armazena a senha no navegador.</p></Card></PageContainer></main></>;
}

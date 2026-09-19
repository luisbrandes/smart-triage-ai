import { NursingLoginForm } from "@/features/nursing/nursing-login-form";
import { AppHeader } from "@/shared/layout/app-header";
import { PageContainer } from "@/shared/layout/page-container";
import { Card } from "@/shared/ui/card";

export default function NursingAccessPage() {
  return <><AppHeader /><main id="conteudo-principal"><PageContainer className="py-12"><Card className="mx-auto max-w-md" title="Acesso da enfermagem" description="Informe sua credencial para acessar a fila de triagens e realizar a revisão profissional."><NursingLoginForm /></Card></PageContainer></main></>;
}

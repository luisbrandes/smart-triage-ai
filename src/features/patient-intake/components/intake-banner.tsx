import { Badge } from "@/shared/ui/badge";
import { Icon } from "@/shared/ui/icon";
import { TriageControls } from "@/features/patient-intake/components/triage-controls";
import { ButtonLink } from "@/shared/ui/button-link";
import { Icon as SharedIcon } from "@/shared/ui/icon";

export function IntakeBanner() {
  return (
    <aside className="mb-6 rounded-lg border border-primary/15 bg-secondary/60 p-4 text-sm leading-6 text-text-secondary">
      <div className="flex flex-wrap items-center gap-2"><Badge variant="info">Revisão humana</Badge><strong className="text-foreground">Suas respostas apoiam a triagem</strong></div>
      <p className="mt-2 flex gap-2"><Icon className="mt-0.5 shrink-0 text-primary" name="shield" size={18} />A recomendação não é um diagnóstico e será avaliada pela equipe de enfermagem.</p>
      <TriageControls />
      <div className="mt-3"><ButtonLink href="/paciente/triagem/anamnese" variant="ghost"><SharedIcon name="back" size={16} />Voltar às informações de saúde</ButtonLink></div>
    </aside>
  );
}

import Link from "next/link";

import { publicNavigation } from "@/shared/config/navigation";
import { NursingNavigation } from "@/features/nurse-shell/components/nursing-navigation";
import { Icon } from "@/shared/ui/icon";

export function NurseSidebar() {
  return (
    <aside className="hidden w-64 shrink-0 border-r border-border bg-surface lg:block">
      <div className="sticky top-0 flex min-h-screen flex-col px-4 py-5">
        <Link className="flex min-h-12 items-center gap-3 rounded-md px-2" href={publicNavigation.home.href}>
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-contrast"><Icon name="pulse" size={20} /></span>
          <span><strong className="block text-sm">Smart Triage</strong><span className="text-xs text-text-muted">Área profissional</span></span>
        </Link>
        <NursingNavigation />
        <div className="mt-auto rounded-md border border-border bg-surface-raised p-3 text-xs leading-5 text-text-muted">
          A recomendação apoia a triagem. A classificação final permanece sob responsabilidade da enfermagem.
        </div>
      </div>
    </aside>
  );
}

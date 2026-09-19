import Link from "next/link";

import { appConfig } from "@/shared/config/app";
import { publicNavigation } from "@/shared/config/navigation";
import { Icon } from "@/shared/ui/icon";
import { PageContainer } from "@/shared/layout/page-container";
import { AccessibilityButton } from "@/features/accessibility/accessibility-provider";

export function AppHeader() {
  return (
    <header className="border-b border-border bg-surface/95">
      <PageContainer className="flex min-h-18 items-center justify-between gap-4 py-3">
        <Link className="flex min-h-11 items-center gap-3 rounded-md" href={publicNavigation.home.href} aria-label="Smart Triage — página inicial">
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-contrast">
            <Icon name="pulse" size={20} />
          </span>
          <span className="font-semibold tracking-tight">{appConfig.name}</span>
        </Link>
        <div className="flex items-center gap-3"><span className="hidden items-center gap-2 text-sm font-medium text-text-secondary lg:flex"><Icon className="text-success" name="shield" size={17} />Triagem assistida com revisão humana</span><AccessibilityButton /></div>
      </PageContainer>
    </header>
  );
}

import type { ReactNode } from "react";
import Link from "next/link";

import { NurseSidebar } from "@/shared/layout/nurse-sidebar";
import { PageContainer } from "@/shared/layout/page-container";
import { publicNavigation } from "@/shared/config/navigation";
import { Badge } from "@/shared/ui/badge";
import { Icon } from "@/shared/ui/icon";
import { redirect } from "next/navigation";
import { getNursingSession } from "@/server/security/nursing-session";
import { NursingNavigation } from "@/features/nurse-shell/components/nursing-navigation";

export default async function NursingLayout({ children }: { children: ReactNode }) {
  if (!(await getNursingSession())) redirect("/acesso-enfermagem");
  return (
    <div className="flex min-h-screen bg-background">
      <NurseSidebar />
      <div className="min-w-0 flex-1">
        <header className="border-b border-border bg-surface">
          <PageContainer className="flex min-h-18 items-center justify-between gap-4 py-3 lg:max-w-none">
            <Link className="flex min-h-11 items-center gap-3 rounded-md lg:hidden" href={publicNavigation.home.href}>
              <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-contrast"><Icon name="pulse" size={19} /></span>
              <span className="font-semibold">Smart Triage</span>
            </Link>
            <div className="hidden lg:block"><p className="text-sm font-semibold">Área da enfermagem</p><p className="text-xs text-text-muted">Visão operacional</p></div>
            <Badge variant="info">Área segura</Badge>
          </PageContainer>
        </header>
        <main className="pb-24 lg:pb-0">{children}</main>
        <NursingNavigation mobile />
      </div>
    </div>
  );
}

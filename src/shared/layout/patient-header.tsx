import Link from "next/link";

import { appConfig } from "@/shared/config/app";
import { publicNavigation } from "@/shared/config/navigation";
import { Badge } from "@/shared/ui/badge";
import { Icon } from "@/shared/ui/icon";
import { PageContainer } from "@/shared/layout/page-container";

export function PatientHeader() {
  return (
    <header className="border-b border-border bg-surface">
      <PageContainer className="flex min-h-18 items-center justify-between py-3">
        <Link className="flex min-h-11 items-center gap-3 rounded-md" href={publicNavigation.home.href}>
          <span className="grid size-9 place-items-center rounded-md bg-primary text-primary-contrast"><Icon name="pulse" size={20} /></span>
          <span className="font-semibold">{appConfig.name}</span>
        </Link>
        <Badge variant="info">Triagem assistida</Badge>
      </PageContainer>
    </header>
  );
}

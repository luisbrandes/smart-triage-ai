"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { nursingNavigation } from "@/shared/config/navigation";
import { Icon } from "@/shared/ui/icon";

export function NursingNavigation({ mobile = false }: { mobile?: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navegação da enfermagem" className={mobile ? "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface/95 px-3 pb-[max(.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur lg:hidden" : "mt-8 space-y-1"}>
      <div className={mobile ? "mx-auto grid max-w-md grid-cols-2 gap-2" : "space-y-1"}>
        {nursingNavigation.map((item) => {
          const active = item.href === "/enfermagem" ? pathname === item.href || pathname.startsWith("/enfermagem/triagens/") : pathname.startsWith(item.href);
          return <Link aria-current={active ? "page" : undefined} className={mobile ? `flex min-h-13 flex-col items-center justify-center gap-1 rounded-md px-3 text-xs font-semibold ${active ? "bg-secondary text-primary" : "text-text-muted"}` : `flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold ${active ? "bg-secondary text-primary" : "text-text-secondary hover:bg-surface-raised"}`} href={item.href} key={item.label}><Icon name={item.icon} size={mobile ? 20 : 19} />{item.label}</Link>;
        })}
      </div>
    </nav>
  );
}

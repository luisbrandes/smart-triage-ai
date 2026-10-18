"use client";

import { useRouter } from "next/navigation";

import { Icon } from "@/shared/ui/icon";

export function BackNavigation() {
  const router = useRouter();
  return <button className="inline-flex min-h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-primary hover:bg-primary/10" onClick={() => router.back()} type="button"><Icon name="back" size={16} />Voltar</button>;
}

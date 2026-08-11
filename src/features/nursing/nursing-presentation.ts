import type { NursingPriority } from "@/server/application/nursing/nursing-types";

export const priorityPresentation: Record<NursingPriority, { label: string; variant: "danger" | "warning" | "success" }> = {
  RED: { label: "Vermelha — recomendação elevada", variant: "danger" },
  YELLOW: { label: "Amarela — recomendação moderada", variant: "warning" },
  GREEN: { label: "Verde — recomendação baixa", variant: "success" },
};

export const originLabels = { MANUAL: "Entrada manual", SIMULATED_DEVICE: "Dispositivo integrado", PHYSICAL_DEVICE: "Dispositivo físico" } as const;

export function formatDateTime(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "UTC" }).format(date);
}

export function formatWait(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

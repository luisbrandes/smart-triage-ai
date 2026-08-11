import { Icon, type IconName } from "@/shared/ui/icon";

const variants = {
  development: { icon: "development", className: "bg-info/10 text-info", label: "Em desenvolvimento" },
  unavailable: { icon: "alert", className: "bg-danger/10 text-danger", label: "Indisponível" },
  demonstration: { icon: "sparkle", className: "bg-warning/10 text-warning", label: "Análise assistiva" },
  ready: { icon: "check", className: "bg-success/10 text-success", label: "Preparado" },
} as const satisfies Record<string, { icon: IconName; className: string; label: string }>;

type StatusIndicatorProps = {
  status: keyof typeof variants;
  label?: string;
};

export function StatusIndicator({ status, label }: StatusIndicatorProps) {
  const variant = variants[status];
  return (
    <span className={`inline-flex min-h-8 items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${variant.className}`}>
      <Icon name={variant.icon} size={15} />
      {label ?? variant.label}
    </span>
  );
}

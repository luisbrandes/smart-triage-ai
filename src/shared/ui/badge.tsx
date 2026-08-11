import type { ReactNode } from "react";

const variants = {
  neutral: "border-border bg-surface-raised text-text-secondary",
  info: "border-info/20 bg-info/10 text-info",
  success: "border-success/20 bg-success/10 text-success",
  warning: "border-warning/20 bg-warning/10 text-warning",
  danger: "border-danger/20 bg-danger/10 text-danger",
} as const;

type BadgeProps = {
  children: ReactNode;
  variant?: keyof typeof variants;
};

export function Badge({ children, variant = "neutral" }: BadgeProps) {
  return (
    <span className={`inline-flex min-h-7 items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${variants[variant]}`}>
      {children}
    </span>
  );
}

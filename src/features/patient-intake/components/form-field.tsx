import type { ReactNode } from "react";

export function FormField({ label, htmlFor, hint, error, children }: { label: string; htmlFor: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold" htmlFor={htmlFor}>{label}</label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs leading-5 text-text-muted">{hint}</p>}
      {error && <p className="mt-1.5 text-sm text-danger" id={`${htmlFor}-error`}>{error}</p>}
    </div>
  );
}

export const fieldClassName = "min-h-11 w-full rounded-md border border-border-strong bg-surface px-3 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:border-focus focus:outline-none";

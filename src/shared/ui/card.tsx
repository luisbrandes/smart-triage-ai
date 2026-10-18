import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  title?: string;
  description?: string;
  header?: ReactNode;
  actions?: ReactNode;
  elevated?: boolean;
  className?: string;
};

export function Card({ children, title, description, header, actions, elevated = false, className = "" }: CardProps) {
  return (
    <section className={`min-w-0 break-words rounded-lg border border-border bg-surface p-5 ${elevated ? "shadow-raised" : "shadow-soft"} ${className}`}>
      {(header || title || description || actions) && (
        <header className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            {header}
            {title && <h2 className="text-lg font-semibold tracking-tight">{title}</h2>}
            {description && <p className="mt-1 text-sm leading-6 text-text-secondary">{description}</p>}
          </div>
          {actions && <div className="min-w-0 max-w-full shrink-0">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

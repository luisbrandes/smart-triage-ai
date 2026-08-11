import type { ReactNode } from "react";

export function PageContainer({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[var(--content-max)] px-5 sm:px-8 lg:px-10 ${className}`}>{children}</div>;
}

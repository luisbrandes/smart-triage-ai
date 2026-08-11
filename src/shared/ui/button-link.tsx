import Link from "next/link";
import type { ReactNode } from "react";

const variants = {
  primary: "border-primary bg-primary text-primary-contrast hover:bg-primary/90",
  secondary: "border-border-strong bg-surface text-foreground hover:bg-secondary",
  ghost: "border-transparent bg-transparent text-text-secondary hover:bg-secondary hover:text-foreground",
} as const;

const sizes = {
  default: "min-h-11 px-4 py-2.5 text-sm",
  large: "min-h-12 px-5 py-3 text-base",
} as const;

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
};

export function ButtonLink({ href, children, variant = "primary", size = "default", className = "" }: ButtonLinkProps) {
  return (
    <Link className={`inline-flex items-center justify-center gap-2 rounded-md border font-semibold shadow-soft transition-colors ${variants[variant]} ${sizes[size]} ${className}`} href={href}>
      {children}
    </Link>
  );
}

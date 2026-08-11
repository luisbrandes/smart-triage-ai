import type { ReactNode } from "react";

import { Icon, type IconName } from "@/shared/ui/icon";

type EmptyStateProps = {
  icon: IconName;
  title: string;
  description: string;
  action?: ReactNode;
};

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-5 py-10 text-center sm:py-14">
      <span className="mb-4 grid size-12 place-items-center rounded-full bg-secondary text-primary">
        <Icon name={icon} size={24} />
      </span>
      <h3 className="text-lg font-semibold">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-text-secondary">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

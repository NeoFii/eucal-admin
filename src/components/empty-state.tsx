import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-gray-200 bg-gray-100">
        <Icon className="h-8 w-8 text-gray-500" />
      </div>
      <p className="mb-1 text-base font-medium text-foreground">{title}</p>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">{description}</p>
      {action}
    </div>
  );
}

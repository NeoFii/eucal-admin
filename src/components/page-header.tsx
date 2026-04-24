import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface PageHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  actions?: ReactNode;
}

export function PageHeader({ icon: Icon, title, subtitle, actions }: PageHeaderProps) {
  return (
    <div className="panel p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-gray-200 bg-gray-100">
            <Icon className="h-6 w-6 text-gray-600" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
            <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}

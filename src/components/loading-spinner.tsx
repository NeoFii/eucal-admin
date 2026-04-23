import { RefreshCw } from "lucide-react";

interface LoadingSpinnerProps {
  text?: string;
}

export function LoadingSpinner({ text = "加载中..." }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <div className="rounded-2xl border border-primary/20 bg-white/80 p-3 shadow-soft">
        <RefreshCw className="h-7 w-7 animate-spin text-primary" />
      </div>
      <p className="text-sm">{text}</p>
    </div>
  );
}


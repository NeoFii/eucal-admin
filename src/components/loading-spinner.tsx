import { RefreshCw } from "lucide-react";

interface LoadingSpinnerProps {
  text?: string;
}

export function LoadingSpinner({ text = "加载中..." }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
      <div className="rounded-2xl border border-gray-200 bg-gray-100 p-3">
        <RefreshCw className="h-7 w-7 animate-spin text-gray-500" />
      </div>
      <p className="text-sm">{text}</p>
    </div>
  );
}


"use client";

interface DateTimeRangePickerProps {
  startValue: string;
  endValue: string;
  onStartChange: (v: string) => void;
  onEndChange: (v: string) => void;
  className?: string;
}

export function DateTimeRangePicker({
  startValue,
  endValue,
  onStartChange,
  onEndChange,
  className,
}: DateTimeRangePickerProps) {
  return (
    <div className={`flex flex-wrap items-center gap-2 ${className ?? ""}`}>
      <input
        type="datetime-local"
        className="h-8 rounded-md border border-gray-200 bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
        value={startValue}
        max={endValue}
        onChange={(e) => onStartChange(e.target.value)}
      />
      <span className="text-sm text-muted-foreground">至</span>
      <input
        type="datetime-local"
        className="h-8 rounded-md border border-gray-200 bg-background px-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-foreground/30"
        value={endValue}
        min={startValue}
        onChange={(e) => onEndChange(e.target.value)}
      />
    </div>
  );
}

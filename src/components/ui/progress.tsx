// =====================================================================
// FluxoGestão — UI: Progress bar (sync feedback)
// =====================================================================
import { cn } from "@/lib/utils";

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0-100
  max?: number;
}

export function Progress({ className, value, max = 100, ...props }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div
      className={cn(
        "relative h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800",
        className
      )}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      {...props}
    >
      <div
        className="h-full w-full flex-1 bg-emerald transition-all duration-300 ease-out"
        style={{ transform: `translateX(-${100 - pct}%)` }}
      />
    </div>
  );
}

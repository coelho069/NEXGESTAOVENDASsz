// =====================================================================
// FluxoGestão — UI: Skeleton (loading placeholder)
// =====================================================================
import { cn } from "@/lib/utils";

export function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-700/60", className)}
      {...props}
    />
  );
}

// =====================================================================
// FluxoGestão — UI: Badge
// =====================================================================
import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "secondary" | "outline" | "destructive" | "success" | "warning";

export function Badge({ className, variant = "default", ...props }: React.HTMLAttributes<HTMLDivElement> & { variant?: BadgeVariant }) {
  const base = "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset";
  const variants: Record<BadgeVariant, string> = {
    default: "bg-slate-900 text-slate-50 ring-slate-900/10",
    secondary: "bg-slate-100 text-slate-700 ring-slate-200",
    outline: "text-slate-700 ring-slate-300",
    destructive: "bg-rose-100 text-rose-800 ring-rose-200",
    success: "bg-emerald-100 text-emerald-800 ring-emerald-200",
    warning: "bg-amber-100 text-amber-800 ring-amber-200",
  };
  return (
    <div className={cn(base, variants[variant], className)} {...props} />
  );
}

import { cn } from "@/lib/utils";

export function Logo({
  className,
  mark = true,
  invert = false,
}: {
  className?: string;
  mark?: boolean;
  invert?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-semibold tracking-tight",
        invert ? "text-white" : "text-slate-900",
        className
      )}
    >
      {mark && (
        <span
          className={cn(
            "relative flex h-7 w-7 items-center justify-center rounded-lg",
            invert ? "bg-white/10 ring-1 ring-white/15" : "bg-slate-900"
          )}
        >
          <span className="absolute h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />
          <span className="absolute h-1.5 w-1.5 animate-ping rounded-full bg-emerald-400/70" />
        </span>
      )}
      FluxoGestão
    </span>
  );
}

// =====================================================================
// FluxoGestão — UI: Input
// =====================================================================
import { cn } from "@/lib/utils";
import { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      type={type}
      className={cn(
        "flex h-10 w-full rounded-xl border border-input bg-background px-3 text-sm",
        "text-foreground placeholder:text-slate-400",
        "focus-within:ring-2 focus-within:ring-ring/30 focus-within:outline-none",
        "transition-colors",
        className
      )}
      ref={ref}
      {...props}
    />
  )
);
Input.displayName = "Input";

import { cloneElement, isValidElement } from "react";
import { cn } from "@/lib/utils";

type ButtonVariant = "primary" | "secondary" | "accent" | "ghost" | "danger" | "outline";
type ButtonSize = "sm" | "md" | "lg" | "icon";

const variantStyles: Record<ButtonVariant, string> = {
  primary:
    "bg-emerald text-white shadow-md shadow-emerald/30 hover:bg-emerald-dark hover:shadow-lg hover:shadow-emerald/40",
  secondary: "bg-slate-100 text-slate-800 hover:bg-slate-200",
  accent: "bg-primary text-primary-foreground hover:bg-slate-800",
  ghost: "text-slate-600 hover:bg-slate-100",
  danger: "bg-rose-500 text-white hover:bg-rose-600",
  outline: "border border-slate-200 bg-transparent hover:bg-slate-50",
};

const sizeStyles: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 py-2",
  lg: "h-12 px-5 text-base",
  icon: "h-9 w-9",
};

const baseStyles =
  "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-medium outline-none transition-all focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  rounding?: "full" | "normal";
  asChild?: boolean;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  rounding = "normal",
  asChild,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    baseStyles,
    variantStyles[variant],
    sizeStyles[size],
    rounding === "full" && "rounded-full",
    className
  );

  if (asChild && isValidElement(children)) {
    const child = children as React.ReactElement<{ className?: string }>;
    return cloneElement(child, { className: cn(classes, child.props.className) });
  }

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
}

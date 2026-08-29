// =====================================================================
// FluxoGestão — UI: Dialog (portal, lightweight, accessible)
// =====================================================================
import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { useEffect } from "react";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  className?: string;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, title, className, children }: DialogProps) {
  useEffect(() => {
    if (!open) return;
    const onEsc = (e: KeyboardEvent) => e.key === "Escape" && onOpenChange(false);
    document.body.style.overflow = "hidden";
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("keydown", onEsc);
      document.body.style.overflow = "";
    };
  }, [open, onOpenChange]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={() => onOpenChange(false)}
    >
      <div
        className={cn("relative w-full max-w-2xl rounded-2xl bg-card p-6 shadow-xl", className)}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
      >
        <button
          className="absolute right-3 top-3 rounded-lg p-1 text-slate-500 hover:bg-slate-100"
          onClick={() => onOpenChange(false)}
          aria-label="Fechar"
        >
          <X className="h-4 w-4" />
        </button>
        <h2 id="dialog-title" className="sr-only">{title}</h2>
        {children}
      </div>
    </div>,
    document.body
  );
}

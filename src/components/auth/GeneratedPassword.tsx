"use client";

import { useState } from "react";
import { Check, Copy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateSecurePassword } from "@/lib/auth/generate-password";
import { useToast } from "@/components/ui/toast";

export function GeneratedPassword({
  value,
  onChange,
  onRegenerate,
  allowRegenerate = true,
}: {
  value: string;
  onChange: (next: string) => void;
  onRegenerate?: () => void;
  allowRegenerate?: boolean;
}) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      toast.push("Copiado!", "ok");
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      toast.push("Não deu para copiar.", "err");
    }
  };

  const regen = () => {
    const next = generateSecurePassword();
    onChange(next);
    onRegenerate?.();
    setCopied(false);
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-slate-500">Senha gerada</span>
        <span className="text-[11px] text-slate-400">16–24 · CSPRNG · não reaparece</span>
      </div>
      <div className="flex gap-2">
        <code className="block min-h-10 flex-1 overflow-x-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm tracking-wide text-slate-900">
          {value || "—"}
        </code>
        <Button type="button" variant="outline" size="icon" onClick={() => void copy()} disabled={!value} aria-label="Copiar senha">
          {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
        </Button>
        {allowRegenerate && (
          <Button type="button" variant="outline" size="icon" onClick={regen} aria-label="Gerar outra senha">
            <RefreshCw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

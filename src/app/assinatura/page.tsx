"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/lib/auth/provider";
import { daysLeft, isSubExpired } from "@/lib/billing/dates";

export default function AssinaturaPage() {
  const { user, logout } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const expired = isSubExpired(user?.subExpiresAt, user?.role);
  const left = daysLeft(user?.subExpiresAt);

  const pay = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await res.json()) as { error?: string; init_point?: string };
      if (!res.ok || !data.init_point) {
        setError(data.error ?? "Pagamento não disponível. Tente outro meio ou mais tarde.");
        return;
      }
      window.location.href = data.init_point;
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0F172A] px-4">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/[0.04] p-10 text-center text-white">
        <Logo invert className="justify-center" />
        <p className="mt-8 text-[11px] font-medium tracking-[0.2em] text-emerald-400 uppercase">
          Pedágio mensal
        </p>
        <h1 className="mt-3 text-3xl font-medium tracking-tight">
          {expired ? "Assinatura vencida." : "Sua assinatura está no fim."}
        </h1>
        <p className="mt-3 text-slate-300">
          {expired
            ? "O caixa e o painel fecham até o Pix ou cartão dos próximos 30 dias."
            : `Faltam ${left} dia(s). Pague agora e não perde o turno.`}
        </p>
        <div className="mt-8 rounded-2xl bg-white/5 px-5 py-4">
          <div className="text-sm text-slate-400">Plano Pro</div>
          <div className="mt-1 text-4xl font-medium">R$ 99</div>
          <div className="text-sm text-slate-500">Pix ou cartão · Mercado Pago · 30 dias</div>
        </div>
        {error && <p className="mt-4 text-sm text-rose-300">{error}</p>}
        <Button className="mt-8 w-full" size="lg" disabled={busy} onClick={() => void pay()}>
          {busy ? "Abrindo checkout…" : "Pagar com Mercado Pago"}
        </Button>
        <button
          type="button"
          className="mt-4 text-xs text-slate-500 underline"
          onClick={() => void logout()}
        >
          Sair
        </button>
      </div>
    </main>
  );
}

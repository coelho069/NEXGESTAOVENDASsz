"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/brand/Logo";
import { useAuth } from "@/lib/auth/provider";

function RetornoInner() {
  const params = useSearchParams();
  const router = useRouter();
  const { refresh } = useAuth();
  const [msg, setMsg] = useState("Confirmando pagamento…");

  useEffect(() => {
    const status = params.get("status") || params.get("collection_status") || "";
    const paymentId = params.get("payment_id") || params.get("collection_id") || "";

    if (status === "failure") {
      setMsg("Pagamento não aprovado. Tente outro meio.");
      return;
    }

    void (async () => {
      const qs = paymentId ? `?payment_id=${encodeURIComponent(paymentId)}` : "";
      const res = await fetch(`/api/billing/reconcile${qs}`, { cache: "no-store" });
      const data = (await res.json()) as { status?: string };
      await refresh();
      if (data.status === "active") {
        router.replace("/user/pdv");
        return;
      }
      if (status === "pending" || data.status === "pending") {
        setMsg("Pagamento em análise. O acesso libera quando o Pix confirmar.");
        return;
      }
      setMsg("Ainda não confirmamos. Se já pagou, aguarde o Pix ou tente de novo.");
    })();
  }, [params, refresh, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0F172A] px-4 text-white">
      <div className="max-w-md text-center">
        <Logo invert className="justify-center" />
        <p className="mt-8 text-slate-300">{msg}</p>
      </div>
    </main>
  );
}

export default function RetornoPage() {
  return (
    <Suspense>
      <RetornoInner />
    </Suspense>
  );
}

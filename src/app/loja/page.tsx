"use client";

import Link from "next/link";
import { useStore } from "@/lib/store";
import { currency } from "@/lib/utils";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

export default function LojaPage() {
  const { state } = useStore();
  const { products, catalogEnabled, ready, store } = state;
  const visible = products.filter((p) => p.catalog_visible);

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-slate-500 sm:inline">
              {store?.name ?? "Mercado Demo"}
            </span>
            <Button asChild size="sm" variant="outline">
              <Link href="/dashboard/catalogo">Voltar à gestão</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-12">
        {!ready ? (
          <p className="text-sm text-slate-500">Carregando vitrine…</p>
        ) : !catalogEnabled ? (
          <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-10 text-center">
            <h1 className="text-xl font-medium">Vitrine desligada</h1>
            <p className="mt-2 text-sm text-slate-500">Liga de novo em Gestão → Catálogo.</p>
            <Button asChild className="mt-6">
              <Link href="/dashboard/catalogo">Abrir o interruptor</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-10 max-w-xl">
              <p className="text-xs font-medium uppercase tracking-wide text-emerald-700">
                Catálogo da loja
              </p>
              <h1 className="mt-2 text-4xl font-medium tracking-tight text-slate-900">
                {store?.name ?? "Mercado Demo"}
              </h1>
              <p className="mt-3 text-slate-600">
                Saldo zero no PDV vira Esgotado aqui, na hora.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
              {visible.map((p, i) => {
                const out = p.stock <= 0;
                return (
                  <motion.article
                    key={p.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                    className={`overflow-hidden rounded-3xl border border-slate-200 bg-white ${out ? "opacity-70" : ""}`}
                  >
                    <div className="relative aspect-[4/3] bg-slate-100">
                      {p.image_url && (
                        <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                      )}
                      {out && (
                        <span className="absolute inset-0 flex items-center justify-center bg-slate-900/55 text-sm font-medium text-white">
                          Esgotado
                        </span>
                      )}
                    </div>
                    <div className="p-4">
                      <div className="text-[10px] uppercase tracking-wide text-slate-400">
                        {p.category}
                      </div>
                      <h2 className="mt-1 line-clamp-2 min-h-[2.5rem] text-sm font-medium">{p.name}</h2>
                      <div className="mt-2 text-base font-semibold">{currency(p.price)}</div>
                    </div>
                  </motion.article>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}

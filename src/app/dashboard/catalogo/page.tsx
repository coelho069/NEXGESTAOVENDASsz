"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/lib/store";
import { currency } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";

export default function CatalogoPage() {
  const { state, actions } = useStore();
  const { products, catalogEnabled, ready } = state;

  return (
    <AppLayout>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-slate-900">Catálogo online</h1>
          <p className="text-sm text-slate-500">A vitrine da loja. Um interruptor.</p>
        </div>
        <div className="flex items-center gap-3">
          <Button asChild variant="outline">
            <Link href="/loja">Ver vitrine</Link>
          </Button>
          <button
            type="button"
            role="switch"
            aria-checked={catalogEnabled}
            onClick={() => void actions.setCatalogEnabled(!catalogEnabled)}
            className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-sm"
          >
            <span
              className={`h-6 w-11 rounded-full p-0.5 transition-colors ${catalogEnabled ? "bg-emerald-500" : "bg-slate-300"}`}
            >
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow transition-transform ${catalogEnabled ? "translate-x-5" : "translate-x-0"}`}
              />
            </span>
            {catalogEnabled ? "Vitrine ligada" : "Vitrine desligada"}
          </button>
        </div>
      </div>

      {!ready ? (
        <Skeleton className="h-64 rounded-3xl" />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-3"
            >
              <div className="h-14 w-14 overflow-hidden rounded-xl bg-slate-100">
                {p.image_url && <img src={p.image_url} alt="" className="h-full w-full object-cover" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{p.name}</div>
                <div className="text-xs text-slate-500">{currency(p.price)}</div>
              </div>
              <button
                type="button"
                onClick={() => void actions.setProductCatalogVisible(p.id, !p.catalog_visible)}
                className={`rounded-full px-3 py-1 text-xs font-medium ${
                  p.catalog_visible ? "bg-emerald-50 text-emerald-800" : "bg-slate-100 text-slate-500"
                }`}
              >
                {p.catalog_visible ? "Na vitrine" : "Oculto"}
              </button>
            </div>
          ))}
        </div>
      )}
    </AppLayout>
  );
}

"use client";

import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProductSearch } from "@/components/pos/ProductSearch";
import { ProductGrid } from "@/components/pos/ProductGrid";
import { Cart } from "@/components/pos/Cart";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";

export default function PosPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Todos");
  const { state } = useStore();

  const categories = useMemo(() => {
    const set = new Set(state.products.map((p) => p.category));
    return ["Todos", ...Array.from(set).sort()];
  }, [state.products]);

  return (
    <AppLayout>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-slate-900">Ponto de venda</h1>
          <p className="text-sm text-slate-500">Toque. Soma. Fecha. Mesmo sem rede.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-4">
          <ProductSearch value={query} onChange={setQuery} />
          <div className="flex gap-2 overflow-x-auto pb-1">
            {categories.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
                  category === c
                    ? "bg-slate-900 text-white ring-slate-900"
                    : "bg-white text-slate-600 ring-slate-200 hover:ring-slate-300"
                )}
              >
                {c}
              </button>
            ))}
          </div>
          <ProductGrid query={query} category={category} />
        </div>
        <Cart />
      </div>
    </AppLayout>
  );
}

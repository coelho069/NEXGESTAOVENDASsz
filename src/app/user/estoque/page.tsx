"use client";

import { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/lib/store";
import { currency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import type { StockStatus } from "@/lib/db";

const statusLabel: Record<StockStatus, string> = {
  out: "Zerado",
  critical: "Crítico",
  low: "Baixo",
  ok: "Ok",
};

export default function UserEstoquePage() {
  const { state } = useStore();
  const [q, setQ] = useState("");
  const rows = useMemo(
    () =>
      state.inventory.filter(
        (r) => !q || r.product.name.toLowerCase().includes(q.toLowerCase())
      ),
    [state.inventory, q]
  );

  return (
    <AppLayout>
      <h1 className="text-2xl font-medium tracking-tight">Estoque</h1>
      <p className="text-sm text-slate-500">Consulta. Sem alterar preço nem quantidade.</p>
      <Input className="mt-4 max-w-xs" placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="mt-4 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-5 py-3 font-medium">Produto</th>
              <th className="px-5 py-3 font-medium">Categoria</th>
              <th className="px-5 py-3 font-medium text-right">Saldo</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Preço</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.product.id} className="border-t border-slate-50">
                <td className="px-5 py-3">{r.product.name}</td>
                <td className="px-5 py-3 text-slate-500">{r.product.category}</td>
                <td className="px-5 py-3 text-right">{r.product.stock}</td>
                <td className="px-5 py-3">
                  <Badge variant={r.status === "ok" ? "success" : r.status === "low" ? "warning" : "destructive"}>
                    {statusLabel[r.status]}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-right">{currency(r.product.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}

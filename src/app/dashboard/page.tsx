"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/lib/store";
import { currency, formatDate } from "@/lib/utils";
import { motion } from "framer-motion";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

export default function DashboardPage() {
  const { state } = useStore();
  const { metrics, sales, ready, pendingCount } = state;

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">Visão geral</h1>
        <p className="text-sm text-slate-500">O turno inteiro, num olhar.</p>
      </div>

      {!ready || !metrics ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-3xl" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Metric
              label="Faturamento"
              value={currency(metrics.total_revenue)}
              hint="7 dias + histórico"
              tone="from-emerald-500/20 to-white"
            />
            <Metric
              label="Vendas"
              value={String(metrics.total_sales)}
              hint={pendingCount ? `${pendingCount} na fila` : "todas conciliadas"}
              tone="from-slate-200 to-white"
            />
            <Metric
              label="Ticket médio"
              value={currency(metrics.avg_ticket)}
              hint="por cupom"
              tone="from-sky-100 to-white"
            />
            <Metric
              label="Lucro líquido"
              value={currency(metrics.profit)}
              hint="venda − custo"
              tone="from-amber-100 to-white"
            />
          </div>

          <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[1.4fr_1fr]">
            <section className="rounded-3xl border border-slate-200/80 bg-white p-6">
              <h2 className="text-sm font-medium text-slate-900">Faturamento · 7 dias</h2>
              <RevenueChart series={metrics.daily_series} />
            </section>
            <section className="rounded-3xl border border-slate-200/80 bg-white p-6">
              <h2 className="text-sm font-medium text-slate-900">Estoque crítico (≤ mínimo)</h2>
              <ul className="mt-4 space-y-3">
                {(metrics.critical_products ?? []).length === 0 && (
                  <li className="text-sm text-slate-500">Nenhum item no mínimo.</li>
                )}
                {(metrics.critical_products ?? []).map((p) => (
                  <li key={p.name} className="flex items-center justify-between text-sm">
                    <span className="truncate pr-3">{p.name}</span>
                    <span className="text-rose-700">
                      {p.stock}/{p.min_stock}
                    </span>
                  </li>
                ))}
              </ul>
              <h2 className="mt-6 text-sm font-medium text-slate-900">Mais vendidos</h2>
              <ul className="mt-4 space-y-3">
                {metrics.top_products.length === 0 && (
                  <li className="text-sm text-slate-500">Feche uma venda no PDV para ver o ranking.</li>
                )}
                {metrics.top_products.map((p) => (
                  <li key={p.name} className="flex items-center justify-between text-sm">
                    <span className="truncate pr-3">{p.name}</span>
                    <span className="font-medium">{currency(p.revenue)}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <section className="mt-6 rounded-3xl border border-slate-200/80 bg-white">
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h2 className="text-sm font-medium text-slate-900">Últimas vendas</h2>
              <Link href="/pos" className="text-xs font-medium text-emerald-700 hover:underline">
                Abrir PDV
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">Quando</th>
                    <th className="px-6 py-3 font-medium">Cliente</th>
                    <th className="px-6 py-3 font-medium">Pagamento</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium text-right">Total</th>
                    <th className="px-6 py-3 font-medium text-right">Lucro</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.slice(0, 8).map((s) => (
                    <tr key={s.id} className="border-t border-slate-50">
                      <td className="px-6 py-3 text-slate-600">
                        {formatDate(s.created_at, { dateStyle: "short", timeStyle: "short" })}
                      </td>
                      <td className="px-6 py-3">{s.customer_name ?? "Balcão"}</td>
                      <td className="px-6 py-3 uppercase text-slate-500">{s.payment_method}</td>
                      <td className="px-6 py-3">
                        <Badge variant={s.status === "synced" ? "success" : "warning"}>
                          {s.status === "synced" ? "Nuvem" : "Fila"}
                        </Badge>
                      </td>
                      <td className="px-6 py-3 text-right font-medium">{currency(s.total)}</td>
                      <td className="px-6 py-3 text-right text-emerald-700">
                        {currency(s.profit ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </AppLayout>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: string;
}) {
  return (
    <motion.div
      className={`rounded-3xl border border-slate-200/70 bg-gradient-to-br ${tone} p-5`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <div className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-2xl font-medium tracking-tight text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-500">{hint}</div>
    </motion.div>
  );
}

function RevenueChart({
  series,
}: {
  series: Array<{ date: string; revenue: number; sales: number; profit?: number }>;
}) {
  const max = Math.max(1, ...series.map((s) => s.revenue));
  return (
    <div className="mt-6 flex h-44 items-end gap-3">
      {series.map((s) => (
        <div key={s.date} className="flex flex-1 flex-col items-center gap-2">
          <motion.div
            className="w-full rounded-t-lg bg-emerald-500"
            initial={{ height: 0 }}
            animate={{ height: `${(s.revenue / max) * 100}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            title={currency(s.revenue)}
          />
          <span className="text-[10px] text-slate-400">
            {new Date(s.date + "T12:00:00").toLocaleDateString("pt-BR", { weekday: "short" })}
          </span>
        </div>
      ))}
    </div>
  );
}

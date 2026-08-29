"use client";

import { motion } from "framer-motion";

const metrics = [
  { label: "Faturamento", value: "R$ 4.832", delta: "+18%" },
  { label: "Vendas", value: "128", delta: "+5%" },
  { label: "Ticket", value: "R$ 37,75", delta: "+2%" },
];
const series = [46, 58, 51, 72, 64, 86, 94];
const max = Math.max(...series);

export function DashboardPreview() {
  return (
    <div className="h-full w-full bg-slate-50 p-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-emerald-500" />
        <span className="text-[10px] font-medium text-slate-500">Gestão · ao vivo</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {metrics.map((m) => (
          <div key={m.label} className="rounded-xl bg-white p-2 shadow-sm">
            <div className="text-[8px] uppercase tracking-wide text-slate-400">{m.label}</div>
            <div className="text-[11px] font-semibold text-slate-900">{m.value}</div>
            <div className="text-[8px] text-emerald-600">{m.delta}</div>
          </div>
        ))}
      </div>
      <div className="mt-4 h-36 rounded-xl bg-white p-3 shadow-sm">
        <div className="text-[8px] uppercase tracking-wide text-slate-400">7 dias</div>
        <div className="mt-2 flex h-24 items-end gap-1.5">
          {series.map((v, i) => (
            <motion.div
              key={i}
              className="flex-1 rounded-t bg-emerald-400"
              initial={{ height: 0 }}
              animate={{ height: `${(v / max) * 100}%` }}
              transition={{ duration: 0.6, delay: 0.15 * i }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

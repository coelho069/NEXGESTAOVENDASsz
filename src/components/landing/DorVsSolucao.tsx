"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { WifiOff, Zap } from "lucide-react";

const pain = [
  "O caixa trava no loading",
  "A fila cresce. A venda some.",
  "Estoque fica no papel",
  "Sobe de novo: nada reconcilia",
];
const flow = [
  "O caixa continua no aparelho",
  "A venda entra na fila local",
  "Estoque baixa na hora",
  "A nuvem recebe quando volta",
];

export function DorVsSolucao() {
  const [down, setDown] = useState(true);

  return (
    <div className="w-full">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <p className="max-w-xl text-sm text-slate-600">
          Um interruptor. Dois destinos. Sistemas comuns congelam. FluxoGestão segue o turno.
        </p>
        <button
          type="button"
          onClick={() => setDown((v) => !v)}
          className={cn(
            "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium ring-1 transition-colors",
            down
              ? "bg-amber-50 text-amber-900 ring-amber-200"
              : "bg-emerald-50 text-emerald-900 ring-emerald-200"
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", down ? "bg-amber-500" : "bg-emerald-500")} />
          {down ? "Internet: caída" : "Internet: estável"}
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <motion.article
          className={cn(
            "relative overflow-hidden rounded-3xl border p-7",
            down ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-white"
          )}
          animate={{ filter: down ? "grayscale(0.7)" : "grayscale(0)" }}
        >
          <div className="flex items-center gap-2 text-rose-800">
            <WifiOff className="h-5 w-5" />
            <h3 className="font-medium">Sistemas comuns</h3>
          </div>
          <ul className="mt-5 space-y-3 text-sm text-rose-950/80">
            {pain.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <span className="mt-2 h-1 w-1 rounded-full bg-rose-400" />
                {p}
              </li>
            ))}
          </ul>
          <AnimatePresence>
            {down && (
              <motion.div
                className="absolute inset-0 flex items-center justify-center bg-white/55 backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <span className="rounded-full bg-rose-600 px-4 py-1.5 text-xs font-medium tracking-wide text-white">
                  SEM SINAL · CAIXA PARADO
                </span>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.article>

        <motion.article className="relative overflow-hidden rounded-3xl border border-emerald-200 bg-emerald-50/70 p-7">
          <div className="flex items-center gap-2 text-emerald-800">
            <Zap className="h-5 w-5" />
            <h3 className="font-medium">FluxoGestão</h3>
          </div>
          <ul className="mt-5 space-y-3 text-sm text-slate-800">
            {flow.map((p) => (
              <li key={p} className="flex items-start gap-2">
                <span className="mt-2 h-1.5 w-1.5 rounded-full bg-emerald-500" />
                {p}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex items-center justify-between rounded-2xl bg-white p-3 text-xs shadow-sm">
            <span className="text-slate-500">{down ? "Fila local" : "Nuvem"}</span>
            <LiveTick down={down} />
          </div>
        </motion.article>
      </div>
    </div>
  );
}

function LiveTick({ down }: { down: boolean }) {
  const [n, setN] = useState(128);
  return (
    <button
      type="button"
      className="font-medium text-emerald-700"
      onClick={() => setN((v) => v + 1)}
    >
      {down ? `venda #${n} salva no aparelho` : `venda #${n} sincronizada`}
    </button>
  );
}

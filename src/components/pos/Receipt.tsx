"use client";

import { motion } from "framer-motion";
import { CheckCircle, FileText, LoaderCircle } from "lucide-react";
import { currency, formatDate } from "@/lib/utils";
import type { Sale } from "@/types";
import { Badge, type BadgeVariant } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import type { FiscalReceiptKind, FiscalReceiptState } from "@/lib/fiscal/client";

const payLabel: Record<Sale["payment_method"], string> = {
  cash: "Dinheiro",
  card: "Cartão",
  pix: "Pix",
  credit: "Crediário",
};

const fiscalBadge: Record<FiscalReceiptKind, BadgeVariant> = {
  processing: "warning",
  offline: "warning",
  validated: "secondary",
  rejected: "destructive",
  unavailable: "warning",
  unauthorized: "destructive",
  error: "destructive",
};

const fiscalTitle: Record<FiscalReceiptKind, string> = {
  processing: "Processando",
  offline: "Pendente",
  validated: "Pré-validada",
  rejected: "Recusada",
  unavailable: "Indisponível",
  unauthorized: "Sem sessão",
  error: "Falha",
};

function FiscalLine({ fiscal }: { fiscal: FiscalReceiptState | undefined }) {
  const kind = fiscal?.kind ?? "processing";
  const message = fiscal?.message ?? "NFC-e em processamento…";
  return (
    <div
      className="mt-3 rounded-xl bg-slate-50 px-3 py-2 text-xs text-slate-600"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 font-medium text-slate-800">
          {kind === "processing" ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin text-amber-600" aria-hidden />
          ) : (
            <FileText className="h-3.5 w-3.5 text-slate-500" aria-hidden />
          )}
          NFC-e
        </span>
        <Badge variant={fiscalBadge[kind]}>{fiscalTitle[kind]}</Badge>
      </div>
      <p className="mt-1 leading-snug">{message}</p>
    </div>
  );
}

export function Receipt({ sale, onClose }: { sale: Sale; onClose: () => void }) {
  const { state } = useStore();
  const fiscal = state.fiscalBySaleId[sale.id];
  const synced = sale.status === "synced";
  return (
    <motion.div
      className="w-full rounded-2xl bg-white p-6"
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">Venda concluída</h2>
          <p className="text-xs text-slate-500">
            #{sale.id.slice(0, 8)} · {formatDate(sale.created_at, { dateStyle: "short", timeStyle: "short" })}
          </p>
        </div>
        <Badge variant={synced ? "success" : "warning"}>
          {synced ? "Sincronizado" : "Salvo offline"}
        </Badge>
      </div>

      <div className="my-4 border-t border-dashed border-slate-200 pt-4 text-sm">
        <div className="mb-2 flex justify-between text-xs text-slate-500">
          <span>Mercado Demo</span>
          <span>{payLabel[sale.payment_method]}</span>
        </div>
        <div className="space-y-1">
          {sale.items.map((it) => (
            <div key={it.id} className="flex justify-between gap-3">
              <span className="min-w-0 truncate">
                {it.product_name} ×{it.quantity}
              </span>
              <span>{currency(it.total_price)}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex justify-between border-t border-slate-200 pt-2 font-medium">
          <span>Total</span>
          <span>{currency(sale.total)}</span>
        </div>
        <FiscalLine fiscal={fiscal} />
      </div>

      <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
        <CheckCircle className="h-4 w-4 text-emerald-600" />
        {synced ? "Já está na nuvem." : "Na fila. Sobe quando a conexão voltar."}
      </div>

      <Button className="mt-5 w-full" size="sm" onClick={onClose}>
        Nova venda
      </Button>
    </motion.div>
  );
}

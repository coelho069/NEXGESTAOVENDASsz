"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, currency } from "@/lib/utils";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog } from "@/components/ui/dialog";
import { Receipt } from "@/components/pos/Receipt";
import type { PaymentMethod, Sale } from "@/types";
import { Minus, Plus, Trash2, Banknote, CreditCard, SmartphoneNfc, WifiOff } from "lucide-react";

const paymentMethods: { id: PaymentMethod; label: string; icon: React.ElementType }[] = [
  { id: "cash", label: "Dinheiro", icon: Banknote },
  { id: "card", label: "Cartão", icon: CreditCard },
  { id: "pix", label: "Pix", icon: SmartphoneNfc },
];

export function Cart() {
  const { state, actions } = useStore();
  const { cart, isOnline, isSyncing, shift } = state;
  const { updateQuantity, removeFromCart, finalizeSale } = actions;

  const [payment, setPayment] = useState<PaymentMethod>("pix");
  const [customer, setCustomer] = useState("");
  const [sale, setSale] = useState<Sale | null>(null);
  const [error, setError] = useState<string | null>(null);

  const subtotal = cart.reduce((a, c) => a + c.product.price * c.quantity, 0);
  const total = Math.round(subtotal * 100) / 100;

  const handleFinalize = async () => {
    setError(null);
    try {
      const result = await finalizeSale(payment, customer || undefined);
      setSale(result);
      setCustomer("");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Erro ao finalizar a venda.");
    }
  };

  return (
    <aside className="flex w-full flex-col gap-4 rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm xl:sticky xl:top-24 xl:max-h-[calc(100vh-8rem)] xl:overflow-y-auto">
      <h2 className="text-xs font-medium uppercase tracking-wide text-slate-400">Carrinho</h2>

      {cart.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="text-sm text-slate-500">Toque em um produto à esquerda.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {cart.map((c) => (
            <li key={c.product.id} className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-slate-900">{c.product.name}</p>
                <p className="text-xs text-slate-500">{currency(c.product.price)}</p>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => updateQuantity(c.product.id, c.quantity - 1)}
                  className="rounded-md border border-slate-200 p-1 text-slate-500 hover:bg-slate-50"
                >
                  <Minus className="h-3.5 w-3.5" />
                </button>
                <span className="w-6 text-center text-sm font-medium">{c.quantity}</span>
                <button
                  type="button"
                  onClick={() => updateQuantity(c.product.id, c.quantity + 1)}
                  disabled={c.quantity >= c.product.stock}
                  className="rounded-md border border-slate-200 p-1 text-slate-500 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Plus className="h-3.5 w-3.5" />
                </button>
              </div>
              <span className="w-16 text-right text-sm font-medium">
                {currency(c.product.price * c.quantity)}
              </span>
              <button
                type="button"
                onClick={() => removeFromCart(c.product.id)}
                className="rounded-md p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {cart.length > 0 && (
        <div className="mt-auto space-y-3 border-t border-slate-100 pt-4">
          <div className="flex justify-between text-lg font-semibold">
            <span>Total</span>
            <span>{currency(total)}</span>
          </div>

          <fieldset className="flex gap-2">
            {paymentMethods.map((pm) => {
              const Icon = pm.icon;
              return (
                <button
                  key={pm.id}
                  type="button"
                  onClick={() => setPayment(pm.id)}
                  className={cn(
                    "flex flex-1 flex-col items-center gap-1 rounded-xl border px-2 py-2 text-xs transition-all",
                    payment === pm.id
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-slate-200 hover:border-slate-300"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {pm.label}
                </button>
              );
            })}
          </fieldset>

          <Input
            placeholder="Nome do cliente (opcional)"
            value={customer}
            onChange={(e) => setCustomer(e.target.value)}
            className="h-9 text-sm"
          />

          {!shift && (
            <a href="/dashboard/caixa" className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600">
              Turno fechado. Abra o caixa para o relatório de sobra/falta.
            </a>
          )}
          {!isOnline && (
            <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-2.5 text-xs text-amber-900">
              <WifiOff className="h-3.5 w-3.5" />
              Salva no aparelho (sync_pending). Sobe quando a rede voltar.
            </div>
          )}

          {error && <p className="text-xs text-rose-600">{error}</p>}

          <AnimatePresence>
            {isSyncing && (
              <motion.div
                className="flex items-center gap-2 text-xs text-slate-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-emerald border-t-transparent" />
                Gravando…
              </motion.div>
            )}
          </AnimatePresence>

          <Button className="w-full" size="lg" disabled={isSyncing} onClick={() => void handleFinalize()}>
            Finalizar venda
          </Button>
        </div>
      )}

      <Dialog
        open={!!sale}
        onOpenChange={(o) => {
          if (!o) setSale(null);
        }}
        title="Recibo da venda"
        className="max-w-md p-0"
      >
        {sale && <Receipt sale={sale} onClose={() => setSale(null)} />}
      </Dialog>
    </aside>
  );
}

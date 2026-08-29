"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useStore } from "@/lib/store";
import { currency, formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export default function CaixaPage() {
  const { state, actions } = useStore();
  const { shift, shifts, sales } = state;
  const [opening, setOpening] = useState("150");
  const [closing, setClosing] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [lastClosed, setLastClosed] = useState<(typeof shifts)[0] | null>(null);

  const cashSales = sales
    .filter((s) => s.shift_id === shift?.id && s.payment_method === "cash")
    .reduce((a, s) => a + s.total, 0);

  const handleOpen = async () => {
    setError(null);
    try {
      await actions.openShift(Number(opening) || 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao abrir");
    }
  };

  const handleClose = async () => {
    setError(null);
    try {
      const closed = await actions.closeShift(Number(closing) || 0, notes);
      setLastClosed(closed);
      setClosing("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Falha ao fechar");
    }
  };

  const diffLabel = (n: number | null) => {
    if (n === null) return "—";
    if (n > 0) return `Sobra ${currency(n)}`;
    if (n < 0) return `Falta ${currency(Math.abs(n))}`;
    return "Bateu";
  };

  return (
    <AppLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-medium tracking-tight text-slate-900">Turno de caixa</h1>
        <p className="text-sm text-slate-500">Abertura, fechamento, sobra e falta.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          {!shift ? (
            <>
              <h2 className="font-medium">Abrir turno</h2>
              <p className="mt-1 text-sm text-slate-500">Informe o fundo de caixa.</p>
              <label className="mt-4 block text-xs uppercase text-slate-400">Valor inicial (R$)</label>
              <Input className="mt-1" value={opening} onChange={(e) => setOpening(e.target.value)} />
              <Button className="mt-4" onClick={() => void handleOpen()}>
                Abrir turno
              </Button>
            </>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <h2 className="font-medium">Turno aberto</h2>
                <Badge variant="success">Aberto</Badge>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Desde {formatDate(shift.opened_at, { dateStyle: "short", timeStyle: "short" })}
              </p>
              <dl className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt>Fundo</dt>
                  <dd>{currency(shift.opening_cash)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Vendas em dinheiro</dt>
                  <dd>{currency(shift.cash_sales || cashSales)}</dd>
                </div>
                <div className="flex justify-between">
                  <dt>Outros (Pix/cartão)</dt>
                  <dd>{currency(shift.other_sales)}</dd>
                </div>
                <div className="flex justify-between font-medium">
                  <dt>Esperado no gaveteiro</dt>
                  <dd>{currency(shift.opening_cash + (shift.cash_sales || cashSales))}</dd>
                </div>
              </dl>
              <label className="mt-5 block text-xs uppercase text-slate-400">Valor contado (R$)</label>
              <Input className="mt-1" value={closing} onChange={(e) => setClosing(e.target.value)} />
              <Input
                className="mt-2"
                placeholder="Observação (opcional)"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
              <Button className="mt-4" variant="accent" onClick={() => void handleClose()}>
                Fechar turno
              </Button>
            </>
          )}
          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
        </section>

        <section className="rounded-3xl border border-slate-200 bg-white p-6">
          <h2 className="font-medium">Último fechamento</h2>
          {lastClosed || shifts.find((s) => s.status === "closed") ? (
            <ClosedCard shift={lastClosed ?? shifts.find((s) => s.status === "closed")!} diffLabel={diffLabel} />
          ) : (
            <p className="mt-3 text-sm text-slate-500">Nenhum turno fechado ainda.</p>
          )}
        </section>
      </div>

      <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <h2 className="border-b border-slate-100 px-6 py-4 text-sm font-medium">Histórico</h2>
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="px-6 py-3 font-medium">Abertura</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium text-right">Inicial</th>
              <th className="px-6 py-3 font-medium text-right">Esperado</th>
              <th className="px-6 py-3 font-medium text-right">Contado</th>
              <th className="px-6 py-3 font-medium text-right">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {shifts.map((s) => (
              <tr key={s.id} className="border-t border-slate-50">
                <td className="px-6 py-3">
                  {formatDate(s.opened_at, { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td className="px-6 py-3">
                  <Badge variant={s.status === "open" ? "success" : "secondary"}>
                    {s.status === "open" ? "Aberto" : "Fechado"}
                  </Badge>
                </td>
                <td className="px-6 py-3 text-right">{currency(s.opening_cash)}</td>
                <td className="px-6 py-3 text-right">{s.expected_cash != null ? currency(s.expected_cash) : "—"}</td>
                <td className="px-6 py-3 text-right">{s.closing_cash != null ? currency(s.closing_cash) : "—"}</td>
                <td className="px-6 py-3 text-right font-medium">{diffLabel(s.difference)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </AppLayout>
  );
}

function ClosedCard({
  shift,
  diffLabel,
}: {
  shift: {
    opening_cash: number;
    expected_cash: number | null;
    closing_cash: number | null;
    difference: number | null;
    cash_sales: number;
  };
  diffLabel: (n: number | null) => string;
}) {
  const tone =
    (shift.difference ?? 0) === 0
      ? "text-emerald-700"
      : (shift.difference ?? 0) > 0
        ? "text-sky-700"
        : "text-rose-700";
  return (
    <dl className="mt-4 space-y-2 text-sm">
      <div className="flex justify-between">
        <dt>Fundo</dt>
        <dd>{currency(shift.opening_cash)}</dd>
      </div>
      <div className="flex justify-between">
        <dt>Dinheiro vendido</dt>
        <dd>{currency(shift.cash_sales)}</dd>
      </div>
      <div className="flex justify-between">
        <dt>Esperado</dt>
        <dd>{shift.expected_cash != null ? currency(shift.expected_cash) : "—"}</dd>
      </div>
      <div className="flex justify-between">
        <dt>Contado</dt>
        <dd>{shift.closing_cash != null ? currency(shift.closing_cash) : "—"}</dd>
      </div>
      <div className={`flex justify-between text-base font-semibold ${tone}`}>
        <dt>Resultado</dt>
        <dd>{diffLabel(shift.difference)}</dd>
      </div>
    </dl>
  );
}

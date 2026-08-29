"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth/provider";
import { useStore } from "@/lib/store";
import { currency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export default function PerfilPage() {
  const { user, logout } = useAuth();
  const { state } = useStore();
  const mine = state.sales.slice(0, 12);

  return (
    <AppLayout>
      <h1 className="text-2xl font-medium tracking-tight">Meu perfil</h1>
      <p className="text-sm text-slate-500">{user?.email}</p>
      <div className="mt-4 rounded-3xl border border-slate-200 bg-white p-6 text-sm">
        <div>Nome: {user?.name}</div>
        <div className="mt-1">Papel: {user?.role === "admin" ? "Administrador" : "Vendedor"}</div>
        <Button className="mt-4" variant="outline" onClick={() => void logout()}>
          Sair
        </Button>
      </div>
      <h2 className="mt-8 text-sm font-medium">Últimas vendas deste caixa</h2>
      <div className="mt-3 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="text-xs uppercase text-slate-400">
            <tr>
              <th className="px-5 py-3 font-medium">Quando</th>
              <th className="px-5 py-3 font-medium">Pagamento</th>
              <th className="px-5 py-3 font-medium">Status</th>
              <th className="px-5 py-3 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {mine.map((s) => (
              <tr key={s.id} className="border-t border-slate-50">
                <td className="px-5 py-3">
                  {formatDate(s.created_at, { dateStyle: "short", timeStyle: "short" })}
                </td>
                <td className="px-5 py-3 uppercase">{s.payment_method}</td>
                <td className="px-5 py-3">
                  <Badge variant={s.sync_pending ? "warning" : "success"}>
                    {s.sync_pending ? "Fila" : "Ok"}
                  </Badge>
                </td>
                <td className="px-5 py-3 text-right">{currency(s.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}

"use client";

import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/lib/auth/provider";
import { useStore } from "@/lib/store";
import { currency } from "@/lib/utils";
import { Boxes, Banknote, Pencil, Users } from "lucide-react";

const cards = [
  { href: "/admin/produtos", label: "Produtos", desc: "Preços, fotos, estoque.", icon: Boxes },
  { href: "/dashboard", label: "Financeiro global", desc: "Lucro, turno, filas.", icon: Banknote },
  { href: "/admin", label: "Site", desc: "Landing, planos, depoimentos.", icon: Pencil },
  { href: "/admin/usuarios", label: "Usuários", desc: "Quem entra como o quê.", icon: Users },
];

export default function AdminDashboardPage() {
  const { user } = useAuth();
  const { state } = useStore();
  return (
    <AppLayout>
      <p className="text-[11px] font-medium uppercase tracking-widest text-slate-400">Administração</p>
      <h1 className="mt-1 text-2xl font-medium tracking-tight">Olá, {user?.name ?? "admin"}</h1>
      <p className="text-sm text-slate-500">Acesso total. Vitrine, caixa e pessoas.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Faturamento" value={currency(state.metrics?.total_revenue ?? 0)} />
        <Stat label="Lucro líquido" value={currency(state.metrics?.profit ?? 0)} />
        <Stat label="Críticos" value={String(state.metrics?.stock_critical ?? 0)} />
        <Stat label="Fila sync" value={String(state.pendingCount)} />
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link
              key={c.href}
              href={c.href}
              className="rounded-3xl border border-slate-200 bg-white p-6 transition hover:border-slate-300 hover:shadow-sm"
            >
              <Icon className="h-5 w-5 text-slate-700" />
              <h2 className="mt-3 font-medium">{c.label}</h2>
              <p className="mt-1 text-sm text-slate-500">{c.desc}</p>
            </Link>
          );
        })}
      </div>
    </AppLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5">
      <div className="text-xs uppercase tracking-wide text-slate-400">{label}</div>
      <div className="mt-2 text-xl font-medium">{value}</div>
    </div>
  );
}

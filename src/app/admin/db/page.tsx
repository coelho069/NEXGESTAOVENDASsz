"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth/provider";
import { useStore } from "@/lib/store";
import { useToast } from "@/components/ui/toast";
import { db } from "@/lib/db";
import {
  listAccounts,
  saveAccount,
  listAudit,
  writeAudit,
  type Account,
  type AuditLog,
} from "@/lib/admin/accounts";
import type { Role } from "@/lib/auth/types";
import type { Product, Sale } from "@/types";
import { currency, formatDate } from "@/lib/utils";

const TABS = ["Usuários", "Produtos", "Vendas", "Logs", "Manutenção"] as const;

export default function DbAdminPage() {
  const { user, isSuper } = useAuth();
  const { actions } = useStore();
  const toast = useToast();
  const [tab, setTab] = useState<(typeof TABS)[number]>("Usuários");
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [q, setQ] = useState("");
  const [confirm, setConfirm] = useState("");
  const [pending, setPending] = useState<{ kind: string; id: string } | null>(null);

  const reload = useCallback(async () => {
    const [dir, p, s, l] = await Promise.all([
      fetch("/api/admin/users", { cache: "no-store" }).then((r) => r.json()),
      db.listAllProducts(),
      db.getSales(),
      listAudit(),
    ]);
    const publicUsers = (dir as { users?: Account[] }).users ?? [];
    const { hydrateAccounts } = await import("@/lib/admin/accounts");
    await hydrateAccounts(publicUsers);
    const a = await listAccounts();
    setAccounts(a);
    setProducts(p);
    setSales(s);
    setLogs(l);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const actor = { id: user?.sub ?? "unknown", name: user?.name ?? "super" };

  const audit = async (
    table: string,
    record_id: string,
    field: string,
    from: string,
    to: string,
    action = "update"
  ) => {
    await writeAudit({
      actor_id: actor.id,
      actor_name: actor.name,
      table,
      record_id,
      field,
      from,
      to,
      action,
    });
    setLogs(await listAudit());
  };

  if (!isSuper && user) {
    return (
      <AppLayout>
        <p className="text-sm text-rose-600">Acesso restrito ao Super Admin.</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-slate-400">Infra</p>
          <h1 className="text-2xl font-medium tracking-tight">DB Admin</h1>
        </div>
        <Button variant="outline" size="sm" onClick={() => void reload()}>
          Recarregar
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            className={`rounded px-3 py-1 font-mono text-xs ${
              tab === t ? "bg-slate-900 text-emerald-300" : "bg-slate-200 text-slate-600"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <Input
        className="mb-4 max-w-sm font-mono text-xs"
        placeholder="filtro"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />

      {tab === "Usuários" && (
        <UsersGrid
          rows={accounts.filter(
            (a) =>
              !q ||
              a.email.includes(q.toLowerCase()) ||
              a.name.toLowerCase().includes(q.toLowerCase())
          )}
          onRole={async (a, role) => {
            const next = { ...a, role };
            await saveAccount(next);
            await audit("profiles", a.id, "role", a.role, role);
            toast.push(`Role de ${a.email} → ${role}`);
            void reload();
          }}
          onLock={async (a) => {
            setPending({ kind: "lock", id: a.id });
            setConfirm("");
          }}
          onReset={async (a) => {
            const { generateSecurePassword } = await import("@/lib/auth/generate-password");
            const pwd = generateSecurePassword();
            await saveAccount({ ...a, password: pwd });
            await audit("profiles", a.id, "password", "••••", "reset");
            try {
              await navigator.clipboard.writeText(pwd);
              toast.push(`Senha de ${a.email} copiada.`);
            } catch {
              toast.push(`Senha temporária de ${a.email}: ${pwd}`);
            }
          }}
        />
      )}

      {tab === "Produtos" && (
        <ProductGrid
          rows={products.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()))}
          onPatch={async (p, field, value) => {
            const from = String((p as unknown as Record<string, unknown>)[field] ?? "");
            await db.updateProduct(p.id, { [field]: value } as Partial<Product>);
            await audit("products", p.id, field, from, String(value));
            toast.push("Produto atualizado");
            void reload();
            void actions.refresh();
          }}
          onSoftDelete={(p) => {
            setPending({ kind: "product", id: p.id });
            setConfirm("");
          }}
        />
      )}

      {tab === "Vendas" && (
        <SalesGrid
          rows={sales.filter(
            (s) =>
              !q ||
              s.id.includes(q) ||
              (s.customer_name ?? "").toLowerCase().includes(q.toLowerCase()) ||
              s.status.includes(q)
          )}
          onPatch={async (s, field, value) => {
            const from = String((s as unknown as Record<string, unknown>)[field] ?? "");
            await db.patchSale(s.id, { [field]: value } as Partial<Sale>);
            await audit("sales", s.id, field, from, String(value));
            toast.push("Venda atualizada");
            void reload();
            void actions.refresh();
          }}
        />
      )}

      {tab === "Logs" && <LogsTable logs={logs} q={q} />}

      {tab === "Manutenção" && (
        <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950 p-6 font-mono text-xs text-emerald-300">
          <p>Backup e sync. Nada some sem rastro.</p>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              onClick={() => {
                const blob = new Blob(
                  [JSON.stringify({ accounts, products, sales, logs }, null, 2)],
                  { type: "application/json" }
                );
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `fluxogestao-backup-${Date.now()}.json`;
                a.click();
                toast.push("Backup JSON baixado");
              }}
            >
              Backup JSON
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const lines = [
                  "id,name,price,stock,category,active",
                  ...products.map(
                    (p) =>
                      `${p.id},"${p.name.replaceAll('"', '""')}",${p.price},${p.stock},${p.category},${p.active}`
                  ),
                ];
                const blob = new Blob([lines.join("\n")], { type: "text/csv" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = `products-${Date.now()}.csv`;
                a.click();
                toast.push("CSV de produtos baixado");
              }}
            >
              CSV produtos
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                await actions.runSync();
                await actions.refresh();
                await reload();
                toast.push("Sincronização forçada");
              }}
            >
              Sync forçada
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                const id = window.prompt("user id para renovar 30 dias");
                if (!id) return;
                const res = await fetch("/api/billing/grant", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ userId: id }),
                });
                if (res.ok) toast.push("Assinatura renovada. O usuário precisa entrar de novo.");
                else toast.push("Falha ao renovar", "err");
              }}
            >
              Marcar pago (user id)
            </Button>
          </div>
        </div>
      )}

      {pending && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <p className="text-sm font-medium">Ação destrutiva</p>
            <p className="mt-1 text-xs text-slate-500">Digite DELETAR para confirmar. Soft delete — o registro permanece.</p>
            <Input className="mt-3" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setPending(null)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={confirm !== "DELETAR"}
                onClick={async () => {
                  if (pending.kind === "product") {
                    const p = products.find((x) => x.id === pending.id);
                    await db.deleteProduct(pending.id);
                    await audit("products", pending.id, "active", "true", "false", "soft_delete");
                    toast.push(`Produto ${p?.name ?? pending.id} marcado excluído`);
                    void actions.refresh();
                  }
                  if (pending.kind === "lock") {
                    const a = accounts.find((x) => x.id === pending.id);
                    if (a) {
                      await saveAccount({ ...a, locked: !a.locked });
                      await audit("profiles", a.id, "locked", String(a.locked), String(!a.locked), "lock");
                      toast.push(a.locked ? "Conta desbloqueada" : "Conta bloqueada");
                    }
                  }
                  setPending(null);
                  void reload();
                }}
              >
                Confirmar
              </Button>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
}

function UsersGrid({
  rows,
  onRole,
  onLock,
  onReset,
}: {
  rows: Account[];
  onRole: (a: Account, role: Role) => void;
  onLock: (a: Account) => void;
  onReset: (a: Account) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
      <table className="w-full text-left font-mono text-xs text-slate-200">
        <thead className="text-[10px] uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">Nome</th>
            <th className="px-3 py-2">E-mail</th>
            <th className="px-3 py-2">Role</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((a) => (
            <tr key={a.id} className="border-t border-slate-800">
              <td className="px-3 py-2">{a.name}</td>
              <td className="px-3 py-2">{a.email}</td>
              <td className="px-3 py-2">
                <select
                  className="bg-slate-900 text-emerald-300"
                  value={a.role}
                  onChange={(e) => onRole(a, e.target.value as Role)}
                >
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                  <option value="superadmin">superadmin</option>
                </select>
              </td>
              <td className="px-3 py-2">
                <Badge variant={a.locked ? "destructive" : "success"}>{a.locked ? "locked" : "ok"}</Badge>
              </td>
              <td className="px-3 py-2 text-right">
                <button className="mr-2 text-amber-300" onClick={() => onReset(a)}>
                  reset senha
                </button>
                <button className="text-rose-300" onClick={() => onLock(a)}>
                  {a.locked ? "desbloquear" : "bloquear"}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Cell({
  value,
  onSave,
}: {
  value: string | number;
  onSave: (v: string) => void;
}) {
  const [edit, setEdit] = useState(false);
  const [v, setV] = useState(String(value));
  useEffect(() => setV(String(value)), [value]);
  if (!edit) {
    return (
      <button type="button" className="w-full text-left hover:bg-slate-800" onClick={() => setEdit(true)}>
        {String(value)}
      </button>
    );
  }
  return (
    <input
      autoFocus
      className="w-full bg-slate-800 px-1 text-emerald-300 outline-none"
      value={v}
      onChange={(e) => setV(e.target.value)}
      onBlur={() => {
        setEdit(false);
        if (v !== String(value)) onSave(v);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

function ProductGrid({
  rows,
  onPatch,
  onSoftDelete,
}: {
  rows: Product[];
  onPatch: (p: Product, field: string, value: unknown) => void;
  onSoftDelete: (p: Product) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
      <table className="w-full text-left font-mono text-xs text-slate-200">
        <thead className="text-[10px] uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">Nome</th>
            <th className="px-3 py-2">Custo</th>
            <th className="px-3 py-2">Venda</th>
            <th className="px-3 py-2">Estoque</th>
            <th className="px-3 py-2">Cat.</th>
            <th className="px-3 py-2">Ativo</th>
            <th className="px-3 py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className={`border-t border-slate-800 ${p.active ? "" : "opacity-40"}`}>
              <td className="px-3 py-1">
                <Cell value={p.name} onSave={(v) => onPatch(p, "name", v)} />
              </td>
              <td className="px-3 py-1">
                <Cell value={p.cost ?? 0} onSave={(v) => onPatch(p, "cost", Number(v))} />
              </td>
              <td className="px-3 py-1">
                <Cell value={p.price} onSave={(v) => onPatch(p, "price", Number(v))} />
              </td>
              <td className="px-3 py-1">
                <Cell value={p.stock} onSave={(v) => onPatch(p, "stock", Number(v))} />
              </td>
              <td className="px-3 py-1">
                <Cell value={p.category} onSave={(v) => onPatch(p, "category", v)} />
              </td>
              <td className="px-3 py-1">{p.active ? "1" : "0"}</td>
              <td className="px-3 py-1 text-right">
                {p.active && (
                  <button className="text-rose-300" onClick={() => onSoftDelete(p)}>
                    soft del
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SalesGrid({
  rows,
  onPatch,
}: {
  rows: Sale[];
  onPatch: (s: Sale, field: string, value: unknown) => void;
}) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
      <table className="w-full text-left font-mono text-xs text-slate-200">
        <thead className="text-[10px] uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">Quando</th>
            <th className="px-3 py-2">Cliente</th>
            <th className="px-3 py-2">Pag.</th>
            <th className="px-3 py-2">Total</th>
            <th className="px-3 py-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.slice(0, 80).map((s) => (
            <tr key={s.id} className="border-t border-slate-800">
              <td className="px-3 py-1 whitespace-nowrap">
                {formatDate(s.created_at, { dateStyle: "short", timeStyle: "short" })}
              </td>
              <td className="px-3 py-1">
                <Cell value={s.customer_name ?? ""} onSave={(v) => onPatch(s, "customer_name", v)} />
              </td>
              <td className="px-3 py-1">{s.payment_method}</td>
              <td className="px-3 py-1">{currency(s.total)}</td>
              <td className="px-3 py-1">
                <Cell value={s.status} onSave={(v) => onPatch(s, "status", v)} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LogsTable({ logs, q }: { logs: AuditLog[]; q: string }) {
  const rows = useMemo(
    () =>
      logs.filter(
        (l) =>
          !q ||
          l.actor_name.toLowerCase().includes(q.toLowerCase()) ||
          l.table.includes(q) ||
          l.field.includes(q)
      ),
    [logs, q]
  );
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950">
      <table className="w-full text-left font-mono text-[11px] text-slate-300">
        <thead className="text-[10px] uppercase text-slate-500">
          <tr>
            <th className="px-3 py-2">Quando</th>
            <th className="px-3 py-2">Quem</th>
            <th className="px-3 py-2">Ação</th>
            <th className="px-3 py-2">Tabela</th>
            <th className="px-3 py-2">Campo</th>
            <th className="px-3 py-2">De</th>
            <th className="px-3 py-2">Para</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((l) => (
            <tr key={l.id} className="border-t border-slate-800">
              <td className="px-3 py-1 whitespace-nowrap">
                {formatDate(l.at, { dateStyle: "short", timeStyle: "short" })}
              </td>
              <td className="px-3 py-1">{l.actor_name}</td>
              <td className="px-3 py-1">{l.action}</td>
              <td className="px-3 py-1">{l.table}</td>
              <td className="px-3 py-1">{l.field}</td>
              <td className="px-3 py-1 text-rose-300">{l.from}</td>
              <td className="px-3 py-1 text-emerald-300">{l.to}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

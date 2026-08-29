"use client";

import { useCallback, useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GeneratedPassword } from "@/components/auth/GeneratedPassword";
import { generateSecurePassword } from "@/lib/auth/generate-password";
import { ROLE_LABEL } from "@/lib/auth/roles";
import { useAuth } from "@/lib/auth/provider";
import { useToast } from "@/components/ui/toast";
import type { Role } from "@/lib/auth/types";

type Row = { id: string; email: string; name: string; role: Role; created_at?: string };

export default function UsuariosPage() {
  const { isSuper } = useAuth();
  const toast = useToast();
  const [users, setUsers] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role>("user");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [revealed, setRevealed] = useState<{ email: string; password: string; role: Role } | null>(
    null
  );

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/users", { cache: "no-store" });
    if (!res.ok) {
      setError("Não autorizado.");
      return;
    }
    const data = (await res.json()) as { users: Row[] };
    setUsers(data.users ?? []);
    setError(null);
  }, []);

  useEffect(() => {
    void load();
    setPassword(generateSecurePassword());
  }, [load]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role, password }),
      });
      const data = (await res.json()) as {
        error?: string;
        password?: string;
        account?: Row;
        warning?: string;
      };
      if (!res.ok) {
        setError(data.error ?? "Não criou.");
        return;
      }
      if (data.warning) toast.push(data.warning, "err");
      else toast.push("Conta criada. Copia a senha agora.", "ok");
      if (data.password && data.account) {
        setRevealed({ email: data.account.email, password: data.password, role: data.account.role });
      }
      setEmail("");
      setName("");
      setRole("user");
      setPassword(generateSecurePassword());
      await load();
    } finally {
      setBusy(false);
    }
  };

  const roles: Role[] = isSuper ? ["superadmin", "admin", "user"] : ["user"];

  return (
    <AppLayout>
      <h1 className="text-2xl font-medium tracking-tight">Usuários</h1>
      <p className="text-sm text-slate-500">
        Super Admin, Admin e Vendedor. A senha nasce com CSPRNG e entra no banco só como hash bcrypt.
      </p>
      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

      <form
        onSubmit={(e) => void create(e)}
        className="mt-6 grid gap-4 rounded-3xl border border-slate-200 bg-white p-5 md:grid-cols-2"
      >
        <label className="block text-sm">
          <span className="text-xs font-medium text-slate-500">Nome</span>
          <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} required />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-medium text-slate-500">E-mail</span>
          <Input
            className="mt-1"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="off"
          />
        </label>
        <label className="block text-sm">
          <span className="text-xs font-medium text-slate-500">Papel</span>
          <select
            className="mt-1 h-10 w-full rounded-xl border border-input bg-background px-3 text-sm"
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
          >
            {roles.map((r) => (
              <option key={r} value={r}>
                {ROLE_LABEL[r]}
              </option>
            ))}
          </select>
        </label>
        <div className="md:col-span-2">
          <GeneratedPassword value={password} onChange={setPassword} />
        </div>
        <div className="md:col-span-2">
          <Button type="submit" disabled={busy || !password}>
            {busy ? "Criando…" : "Criar conta"}
          </Button>
        </div>
      </form>

      {revealed && (
        <div className="mt-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-sm font-medium text-emerald-950">
            Entregue esta senha para {revealed.email} ({ROLE_LABEL[revealed.role]}). Ela não volta a ser
            mostrada.
          </p>
          <div className="mt-3">
            <GeneratedPassword
              value={revealed.password}
              onChange={(v) => setRevealed({ ...revealed, password: v })}
              allowRegenerate={false}
            />
          </div>
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-400">
            <tr>
              <th className="px-5 py-3 font-medium">Nome</th>
              <th className="px-5 py-3 font-medium">E-mail</th>
              <th className="px-5 py-3 font-medium">Papel</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-slate-100">
                <td className="px-5 py-3">{u.name}</td>
                <td className="px-5 py-3">{u.email}</td>
                <td className="px-5 py-3">
                  <Badge variant={u.role === "user" ? "secondary" : "success"}>{ROLE_LABEL[u.role]}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppLayout>
  );
}

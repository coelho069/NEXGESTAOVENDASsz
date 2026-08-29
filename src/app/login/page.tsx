"use client";

import { Suspense, useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/brand/Logo";
import { loginAction, type LoginState } from "./actions";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function Submit() {
  const { pending } = useFormStatus();
  return (
    <Button className="mt-6 w-full" type="submit" disabled={pending}>
      {pending ? "Entrando…" : "Entrar"}
    </Button>
  );
}

function LoginForm() {
  const next = useSearchParams().get("next");
  const [state, action] = useActionState<LoginState, FormData>(loginAction, null);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0F172A] px-4">
      <form
        action={action}
        method="post"
        className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-white shadow-2xl"
      >
        <Logo invert />
        <h1 className="mt-6 text-2xl font-medium tracking-tight">Entrar</h1>
        <p className="mt-1 text-sm text-slate-400">O papel define o que você vê. Admin gere. Vendedor vende.</p>
        {next && next.startsWith("/") && <input type="hidden" name="next" value={next} />}
        <label className="mt-6 block text-xs text-slate-400">E-mail</label>
        <Input
          className="mt-1 bg-white/5 text-white"
          name="email"
          autoComplete="username"
          required
        />
        <label className="mt-3 block text-xs text-slate-400">Senha</label>
        <Input
          className="mt-1 bg-white/5 text-white"
          name="password"
          type="password"
          autoComplete="current-password"
          required
        />
        {state?.error && <p className="mt-3 text-sm text-rose-300">{state.error}</p>}
        <Submit />
        <p className="mt-6 text-xs text-slate-500">Sessão criptografada no servidor. Sem senha na tela.</p>
      </form>
    </main>
  );
}

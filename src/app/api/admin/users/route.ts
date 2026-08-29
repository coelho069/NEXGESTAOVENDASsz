import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE, type Role } from "@/lib/auth/types";
import { verifySession } from "@/lib/auth/token";
import { createAccount, listPublicAccounts } from "@/lib/auth/account-store";
import { canAssignRole } from "@/lib/auth/roles";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function actor() {
  const jar = await cookies();
  const user = await verifySession(jar.get(COOKIE)?.value);
  if (!user || (user.role !== "admin" && user.role !== "superadmin")) return null;
  return user;
}

export async function GET() {
  const user = await actor();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  return NextResponse.json({ users: await listPublicAccounts() });
}

export async function POST(req: Request) {
  const user = await actor();
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const body = (await req.json().catch(() => null)) as {
    email?: string;
    name?: string;
    role?: Role;
    password?: string;
  } | null;

  const role: Role =
    body?.role === "superadmin" || body?.role === "admin" || body?.role === "user"
      ? body.role
      : "user";

  if (!canAssignRole(user.role, role)) {
    return NextResponse.json({ error: "Sem permissão para este papel." }, { status: 403 });
  }

  try {
    const created = await createAccount({
      email: body?.email ?? "",
      name: body?.name ?? "",
      role,
      password: body?.password,
    });

    if (supabaseAdmin) {
      const { error } = await supabaseAdmin.auth.admin.createUser({
        email: created.account.email,
        password: created.password,
        email_confirm: true,
        user_metadata: {
          role: created.account.role,
          display_name: created.account.name,
        },
      });
      if (error && !/already/i.test(error.message)) {
        return NextResponse.json(
          { ...created, warning: `Conta local criada. Supabase: ${error.message}` },
          { status: 201 }
        );
      }
    }

    return NextResponse.json(created, { status: 201 });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Falha ao criar conta.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/auth/types";
import { verifySession } from "@/lib/auth/token";
import { renewSubscription } from "@/lib/billing/store";

export async function POST(req: Request) {
  const jar = await cookies();
  const user = await verifySession(jar.get(COOKIE)?.value);
  if (!user || user.role !== "superadmin") {
    return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  }
  const body = (await req.json()) as { userId?: string };
  const userId = body.userId;
  if (!userId) return NextResponse.json({ error: "Usuário inválido." }, { status: 400 });
  const sub = renewSubscription(userId);
  return NextResponse.json({ ok: true, expires_at: sub.expires_at });
}

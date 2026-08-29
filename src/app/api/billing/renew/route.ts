import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE, SECRET } from "@/lib/auth/types";
import { verifySession, signSession } from "@/lib/auth/token";
import { cookieOptions } from "@/lib/auth/session-cookie";
import { renewSubscription } from "@/lib/billing/store";

export async function POST(req: Request) {
  const jar = await cookies();
  const user = await verifySession(jar.get(COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!SECRET) return NextResponse.json({ error: "Indisponível." }, { status: 500 });

  const sub = renewSubscription(user.sub);
  const next = { ...user, subExpiresAt: sub.expires_at };
  const token = await signSession(next);
  const res = NextResponse.json({
    ok: true,
    expires_at: sub.expires_at,
    redirect: user.role === "admin" ? "/admin/dashboard" : "/user/pdv",
  });
  res.cookies.set(COOKIE, token, cookieOptions(req));
  return res;
}

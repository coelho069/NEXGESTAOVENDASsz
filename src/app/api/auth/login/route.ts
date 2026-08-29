import { NextResponse } from "next/server";
import { COOKIE, SECRET } from "@/lib/auth/types";
import { signSession } from "@/lib/auth/token";
import { cookieOptions } from "@/lib/auth/session-cookie";
import { authenticate, redirectFor } from "@/lib/auth/authenticate";
import { loginRateLimit, parseLoginBody } from "@/lib/auth/rate-limit";

export async function POST(req: Request) {
  try {
    const limited = loginRateLimit(req);
    if (!limited.ok) {
      return NextResponse.json(
        { error: "Usuário ou senha inválidos" },
        { status: 429, headers: { "Retry-After": String(limited.retryAfter) } }
      );
    }

    const parsed = parseLoginBody(await req.json().catch(() => null));
    if (!parsed) {
      return NextResponse.json({ error: "Usuário ou senha inválidos" }, { status: 401 });
    }

    const session = await authenticate(parsed.email, parsed.password);
    if (!session) {
      return NextResponse.json({ error: "Usuário ou senha inválidos" }, { status: 401 });
    }
    if (!SECRET) {
      return NextResponse.json({ error: "Usuário ou senha inválidos" }, { status: 500 });
    }

    const token = await signSession(session);
    const res = NextResponse.json({ ok: true, redirect: redirectFor(session) });
    res.cookies.set(COOKIE, token, cookieOptions(req));
    return res;
  } catch {
    return NextResponse.json({ error: "Usuário ou senha inválidos" }, { status: 401 });
  }
}

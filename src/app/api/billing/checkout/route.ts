import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE } from "@/lib/auth/types";
import { verifySession } from "@/lib/auth/token";
import { createPreference, mpConfigured } from "@/lib/billing/mercadopago";
import { markPending } from "@/lib/billing/store";

export async function POST(req: Request) {
  const jar = await cookies();
  const user = await verifySession(jar.get(COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
  if (!mpConfigured()) {
    return NextResponse.json({ error: "Pagamento indisponível no momento." }, { status: 503 });
  }

  const url = new URL(req.url);
  const origin =
    req.headers.get("origin") ||
    process.env.APP_URL ||
    `${url.protocol}//${req.headers.get("host")}`;

  try {
    const pref = await createPreference({
      userId: user.sub,
      email: user.email,
      title: "FluxoGestão Pro — 30 dias",
      amount: Number(process.env.BILLING_PRICE_BRL || 99),
      notificationUrl: `${origin}/api/billing/webhook`,
      successUrl: `${origin}/assinatura/retorno?status=success`,
      failureUrl: `${origin}/assinatura/retorno?status=failure`,
      pendingUrl: `${origin}/assinatura/retorno?status=pending`,
    });
    markPending(user.sub, pref.id);
    return NextResponse.json({ init_point: pref.init_point });
  } catch {
    return NextResponse.json({ error: "Não foi possível abrir o checkout." }, { status: 502 });
  }
}

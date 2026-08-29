import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { COOKIE, SECRET } from "@/lib/auth/types";
import { signSession, verifySession } from "@/lib/auth/token";
import { cookieOptions } from "@/lib/auth/session-cookie";
import { getPayment } from "@/lib/billing/mercadopago";
import { getSubscription, markPastDue, renewSubscription } from "@/lib/billing/store";

export async function GET(req: Request) {
  const jar = await cookies();
  const user = await verifySession(jar.get(COOKIE)?.value);
  if (!user) return NextResponse.json({ error: "Não autorizado." }, { status: 401 });

  const url = new URL(req.url);
  const paymentId = url.searchParams.get("payment_id") || url.searchParams.get("collection_id");
  let sub = getSubscription(user.sub);

  if (paymentId) {
    const payment = await getPayment(paymentId);
    if (payment?.external_reference === user.sub) {
      if (payment.status === "approved") sub = renewSubscription(user.sub, String(payment.id));
      else if (payment.status === "rejected" || payment.status === "cancelled") {
        sub = markPastDue(user.sub) ?? sub;
      }
    }
  }

  if (!SECRET) return NextResponse.json({ status: sub?.status ?? "unknown" });
  const next = { ...user, subExpiresAt: sub?.expires_at ?? user.subExpiresAt };
  const token = await signSession(next);
  const res = NextResponse.json({
    status: sub?.status ?? "unknown",
    expires_at: sub?.expires_at ?? null,
  });
  res.cookies.set(COOKIE, token, cookieOptions(req));
  return res;
}

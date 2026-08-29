import { NextResponse } from "next/server";
import { getPayment, verifyWebhookSignature } from "@/lib/billing/mercadopago";
import { markPastDue, renewSubscription } from "@/lib/billing/store";

async function applyPayment(paymentId: string, req: Request) {
  const secret = process.env.MP_WEBHOOK_SECRET ?? "";
  const dataId = paymentId;
  const ok = verifyWebhookSignature(
    req.headers.get("x-signature"),
    req.headers.get("x-request-id"),
    dataId,
    secret
  );
  if (secret && !ok) return false;

  const payment = await getPayment(paymentId);
  if (!payment?.external_reference) return true;
  const userId = payment.external_reference;
  if (payment.status === "approved") {
    renewSubscription(userId, String(payment.id));
  } else if (payment.status === "rejected" || payment.status === "cancelled") {
    markPastDue(userId);
  }
  return true;
}

export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const qsId = url.searchParams.get("data.id") || url.searchParams.get("id");
    const topic = url.searchParams.get("type") || url.searchParams.get("topic");
    let paymentId = qsId;
    if (!paymentId) {
      const body = (await req.json().catch(() => null)) as
        | { data?: { id?: string | number }; type?: string; action?: string }
        | null;
      paymentId = body?.data?.id != null ? String(body.data.id) : null;
      if (!topic && body?.type !== "payment" && body?.action && !String(body.action).includes("payment")) {
        return NextResponse.json({ ok: true });
      }
    }
    if (paymentId) await applyPayment(paymentId, req);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: true });
  }
}

export async function GET(req: Request) {
  return POST(req);
}

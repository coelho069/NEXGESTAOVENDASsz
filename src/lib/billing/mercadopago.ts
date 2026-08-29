import { createHmac } from "crypto";

const API = "https://api.mercadopago.com";

function token() {
  return process.env.MP_ACCESS_TOKEN ?? "";
}

export function mpConfigured() {
  return Boolean(token());
}

export async function createPreference(input: {
  userId: string;
  email: string;
  title: string;
  amount: number;
  notificationUrl: string;
  successUrl: string;
  failureUrl: string;
  pendingUrl: string;
}) {
  const res = await fetch(`${API}/checkout/preferences`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      items: [
        {
          title: input.title,
          quantity: 1,
          currency_id: "BRL",
          unit_price: input.amount,
        },
      ],
      payer: { email: input.email },
      external_reference: input.userId,
      notification_url: input.notificationUrl,
      back_urls: {
        success: input.successUrl,
        failure: input.failureUrl,
        pending: input.pendingUrl,
      },
      auto_return: "approved",
      statement_descriptor: "FLUXOGESTAO",
    }),
  });
  const data = (await res.json()) as {
    id?: string;
    init_point?: string;
    sandbox_init_point?: string;
    message?: string;
  };
  if (!res.ok || !data.id) {
    throw new Error("checkout_unavailable");
  }
  return {
    id: data.id,
    init_point: data.sandbox_init_point || data.init_point || "",
  };
}

export async function getPayment(id: string) {
  const res = await fetch(`${API}/v1/payments/${id}`, {
    headers: { Authorization: `Bearer ${token()}` },
    cache: "no-store",
  });
  if (!res.ok) return null;
  return (await res.json()) as {
    id: number;
    status: string;
    external_reference?: string;
  };
}

export function verifyWebhookSignature(
  xSignature: string | null,
  xRequestId: string | null,
  dataId: string,
  secret: string
) {
  if (!secret || !xSignature || !xRequestId) return !secret;
  const parts: Record<string, string> = {};
  for (const p of xSignature.split(",")) {
    const [k, v] = p.split("=").map((s) => s.trim());
    if (k && v) parts[k] = v;
  }
  const ts = parts.ts;
  const v1 = parts.v1;
  if (!ts || !v1) return false;
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  const hash = createHmac("sha256", secret).update(manifest).digest("hex");
  return hash === v1;
}

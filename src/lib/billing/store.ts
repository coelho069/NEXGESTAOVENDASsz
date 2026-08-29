import { mkdirSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { expiresAtFromPayment } from "@/lib/billing/dates";

export type SubStatus = "active" | "pending" | "past_due" | "canceled" | "expired";

export interface Subscription {
  user_id: string;
  plan: string;
  status: SubStatus;
  started_at: string;
  expires_at: string;
  last_payment_at: string;
  preference_id?: string;
  last_gateway_payment_id?: string;
}

const FILE = join(process.cwd(), ".data", "subscriptions.json");

function load(): Record<string, Subscription> {
  try {
    return JSON.parse(readFileSync(FILE, "utf8")) as Record<string, Subscription>;
  } catch {
    return {};
  }
}

function save(all: Record<string, Subscription>) {
  mkdirSync(dirname(FILE), { recursive: true });
  writeFileSync(FILE, JSON.stringify(all, null, 2));
}

function refreshStatus(s: Subscription): Subscription {
  if (Date.now() >= Date.parse(s.expires_at) && s.status === "active") {
    return { ...s, status: "expired" };
  }
  return s;
}

export function getSubscription(userId: string): Subscription | null {
  const all = load();
  const s = all[userId];
  if (!s) return null;
  const next = refreshStatus(s);
  if (next !== s) {
    all[userId] = next;
    save(all);
  }
  return next;
}

export function ensureSubscription(userId: string): Subscription {
  const existing = getSubscription(userId);
  if (existing) return existing;
  const now = new Date();
  const sub: Subscription = {
    user_id: userId,
    plan: "pro",
    status: "active",
    started_at: now.toISOString(),
    last_payment_at: now.toISOString(),
    expires_at: expiresAtFromPayment(now),
  };
  const all = load();
  all[userId] = sub;
  save(all);
  return sub;
}

export function markPending(userId: string, preferenceId: string): Subscription {
  const prev = getSubscription(userId) ?? ensureSubscription(userId);
  const sub: Subscription = {
    ...prev,
    status: prev.status === "active" && Date.now() < Date.parse(prev.expires_at) ? prev.status : "pending",
    preference_id: preferenceId,
  };
  const all = load();
  all[userId] = sub;
  save(all);
  return sub;
}

export function renewSubscription(userId: string, gatewayPaymentId?: string): Subscription {
  const now = new Date();
  const prev = getSubscription(userId);
  const sub: Subscription = {
    user_id: userId,
    plan: prev?.plan ?? "pro",
    status: "active",
    started_at: prev?.started_at ?? now.toISOString(),
    last_payment_at: now.toISOString(),
    expires_at: expiresAtFromPayment(now),
    preference_id: prev?.preference_id,
    last_gateway_payment_id: gatewayPaymentId ?? prev?.last_gateway_payment_id,
  };
  const all = load();
  all[userId] = sub;
  save(all);
  return sub;
}

export function markPastDue(userId: string) {
  const prev = getSubscription(userId);
  if (!prev) return null;
  const sub = { ...prev, status: "past_due" as const };
  const all = load();
  all[userId] = sub;
  save(all);
  return sub;
}

export function listSubscriptions() {
  const all = load();
  return Object.values(all).map(refreshStatus);
}

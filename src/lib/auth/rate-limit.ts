const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientIp(req: Request) {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() || "unknown";
  return req.headers.get("x-real-ip") || "unknown";
}

export function loginRateLimit(req: Request): { ok: true } | { ok: false; retryAfter: number } {
  const key = `login:${clientIp(req)}`;
  const now = Date.now();
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return { ok: true };
  }
  if (existing.count >= MAX_ATTEMPTS) {
    return { ok: false, retryAfter: Math.ceil((existing.resetAt - now) / 1000) };
  }
  existing.count += 1;
  return { ok: true };
}

export function parseLoginBody(input: unknown): { email: string; password: string } | null {
  if (!input || typeof input !== "object" || Array.isArray(input)) return null;
  const rec = input as Record<string, unknown>;
  if (typeof rec.email !== "string" || typeof rec.password !== "string") return null;
  if (Object.hasOwn(rec, "$gt") || Object.hasOwn(rec, "$where") || Object.hasOwn(rec, "__proto__")) {
    return null;
  }
  const email = rec.email.trim();
  const password = rec.password;
  if (!email || email.length > 180 || password.length < 1 || password.length > 200) return null;
  if (email.includes("\0") || password.includes("\0")) return null;
  return { email, password };
}

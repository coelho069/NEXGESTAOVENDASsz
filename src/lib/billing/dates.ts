const TZ = "America/Sao_Paulo";

function ymdInTz(d: Date, tz: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const n = (t: string) => Number(parts.find((p) => p.type === t)?.value);
  return { y: n("year"), m: n("month"), d: n("day") };
}

/** 23:59:59.999 in America/Sao_Paulo as UTC ISO (SP is UTC-3, sem DST). */
function endOfSpDay(y: number, m: number, d: number) {
  return new Date(Date.UTC(y, m - 1, d, 23 + 3, 59, 59, 999)).toISOString();
}

export function expiresAtFromPayment(paidAt = new Date()) {
  const start = ymdInTz(paidAt, TZ);
  const anchor = Date.UTC(start.y, start.m - 1, start.d, 15, 0, 0);
  const plus = new Date(anchor + 30 * 24 * 60 * 60 * 1000);
  const end = ymdInTz(plus, TZ);
  return endOfSpDay(end.y, end.m, end.d);
}

export function isSubExpired(
  expiresAt: string | null | undefined,
  role?: string
) {
  if (role === "superadmin") return false;
  if (!expiresAt) return true;
  return Date.now() >= Date.parse(expiresAt);
}

export function daysLeft(expiresAt: string | null | undefined) {
  if (!expiresAt) return 0;
  const ms = Date.parse(expiresAt) - Date.now();
  if (ms <= 0) return 0;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

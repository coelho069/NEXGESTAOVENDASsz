import { SECRET, type SessionUser } from "@/lib/auth/types";

const enc = new TextEncoder();

function b64url(bytes: ArrayBuffer | Uint8Array) {
  const arr = bytes instanceof ArrayBuffer ? new Uint8Array(bytes) : bytes;
  let s = "";
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function b64urlJson(obj: unknown) {
  return b64url(enc.encode(JSON.stringify(obj)));
}

function fromB64url(s: string) {
  const pad = s.replace(/-/g, "+").replace(/_/g, "/");
  const padded = pad + "=".repeat((4 - (pad.length % 4)) % 4);
  const bin = atob(padded);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function key(secret: string) {
  return crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, [
    "sign",
    "verify",
  ]);
}

export async function signSession(user: SessionUser, secret = SECRET) {
  if (!secret) throw new Error("missing secret");
  const payload = b64urlJson(user);
  const k = await key(secret);
  const sig = await crypto.subtle.sign("HMAC", k, enc.encode(payload));
  return `${payload}.${b64url(sig)}`;
}

export async function verifySession(token: string | undefined, secret = SECRET): Promise<SessionUser | null> {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  try {
    const k = await key(secret);
    const ok = await crypto.subtle.verify("HMAC", k, fromB64url(sig), enc.encode(payload));
    if (!ok) return null;
    const json = new TextDecoder().decode(fromB64url(payload));
    const user = JSON.parse(json) as SessionUser;
    if (user.exp < Date.now()) return null;
    if (user.role !== "admin" && user.role !== "user" && user.role !== "superadmin") return null;
    return user;
  } catch {
    return null;
  }
}

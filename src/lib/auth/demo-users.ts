import { createHash, timingSafeEqual } from "crypto";
import type { Role } from "@/lib/auth/types";

export interface ServerUser {
  id: string;
  email: string;
  password: string;
  name: string;
  role: Role;
}

function envUser(
  id: string,
  email: string | undefined,
  password: string | undefined,
  name: string | undefined,
  role: Role
): ServerUser | null {
  const e = email?.trim();
  const p = password ?? "";
  if (!e || !p) return null;
  return { id, email: e, password: p, name: name?.trim() || e, role };
}

export function listServerUsers(): ServerUser[] {
  return [
    envUser("usr-admin", process.env.AUTH_ADMIN_EMAIL, process.env.AUTH_ADMIN_PASSWORD, process.env.AUTH_ADMIN_NAME, "admin"),
    envUser("usr-vendedor", process.env.AUTH_USER_EMAIL, process.env.AUTH_USER_PASSWORD, process.env.AUTH_USER_NAME, "user"),
    envUser("usr-super", process.env.AUTH_SUPER_EMAIL, process.env.AUTH_SUPER_PASSWORD, process.env.AUTH_SUPER_NAME, "superadmin"),
  ].filter((u): u is ServerUser => u !== null);
}

export function publicDirectory() {
  return listServerUsers().map(({ id, email, name, role }) => ({ id, email, name, role }));
}

function timingSafeEqualStr(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

export function findDemoUser(email: string, password: string) {
  const needle = email.trim().toLowerCase();
  return (
    listServerUsers().find((u) => {
      const emailOk = timingSafeEqualStr(u.email.toLowerCase(), needle);
      const passOk = timingSafeEqualStr(u.password, password);
      return emailOk && passOk;
    }) ?? undefined
  );
}

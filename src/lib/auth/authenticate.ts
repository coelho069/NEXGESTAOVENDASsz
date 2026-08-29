import type { SessionUser } from "@/lib/auth/types";
import { findDemoUser } from "@/lib/auth/demo-users";
import { findStoredUser } from "@/lib/auth/account-store";
import { supabase, isCloudConfigured } from "@/lib/supabase";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { ensureSubscription } from "@/lib/billing/store";
import { isSubExpired } from "@/lib/billing/dates";

const CLOUD_MS = 1200;

function sessionOf(
  sub: string,
  email: string,
  name: string,
  role: SessionUser["role"]
): SessionUser {
  return {
    sub,
    email,
    name,
    role,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
    subExpiresAt: null,
  };
}

async function cloudLogin(email: string, password: string): Promise<SessionUser | null> {
  if (!isCloudConfigured() || !supabase) return null;
  const { data, error } = await Promise.race([
    supabase.auth.signInWithPassword({ email, password }),
    new Promise<never>((_, reject) => setTimeout(() => reject(new Error("supabase_timeout")), CLOUD_MS)),
  ]);
  if (error || !data.user) return null;
  const reader = supabaseAdmin ?? supabase;
  const { data: profile } = await reader
    .from("profiles")
    .select("role, display_name")
    .eq("id", data.user.id)
    .maybeSingle();
  const meta = (data.user.user_metadata ?? {}) as { role?: string; display_name?: string };
  const rawRole = profile?.role || meta.role || "user";
  const role: SessionUser["role"] =
    rawRole === "superadmin" ? "superadmin" : rawRole === "admin" ? "admin" : "user";
  return sessionOf(
    data.user.id,
    data.user.email ?? email,
    profile?.display_name || meta.display_name || data.user.email || "Usuário",
    role
  );
}

export function redirectFor(session: SessionUser): string {
  if (isSubExpired(session.subExpiresAt, session.role)) return "/assinatura";
  if (session.role === "superadmin") return "/admin/db";
  if (session.role === "admin") return "/admin/dashboard";
  return "/user/pdv";
}

export async function authenticate(email: string, password: string): Promise<SessionUser | null> {
  const stored = await findStoredUser(email, password);
  if (stored) {
    const session = sessionOf(stored.id, stored.email, stored.name, stored.role);
    if (session.role !== "superadmin") {
      session.subExpiresAt = ensureSubscription(session.sub).expires_at;
    }
    return session;
  }

  const demo = findDemoUser(email, password);

  try {
    const cloud = await cloudLogin(email, password);
    if (cloud) {
      if (cloud.role !== "superadmin") {
        cloud.subExpiresAt = ensureSubscription(cloud.sub).expires_at;
      }
      return cloud;
    }
  } catch {
    /* demo fallback */
  }

  if (!demo) return null;
  const session = sessionOf(demo.id, demo.email, demo.name, demo.role);
  if (session.role !== "superadmin") {
    session.subExpiresAt = ensureSubscription(session.sub).expires_at;
  }
  return session;
}

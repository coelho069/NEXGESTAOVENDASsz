/**
 * FluxoGestão — Supabase adapter (demo)
 *
 * The sales demo is local-first. IndexedDB is the source of truth so the
 * product works without a project URL or anon key.
 *
 * When credentials exist, swap the implementations in `src/lib/db.ts`
 * to call this client instead of IndexedDB. The UI never talks to
 * Supabase directly.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function env(name: string) {
  return (process.env[name] ?? "").trim();
}

const url = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL");
const publishable =
  env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY") ||
  env("NEXT_PUBLIC_SUPABASE_ANON_KEY") ||
  env("SUPABASE_PUBLISHABLE_KEY") ||
  env("SUPABASE_ANON_KEY");

export const supabase: SupabaseClient | null =
  url && publishable ? createClient(url, publishable) : null;

export const isCloudConfigured = () => supabase !== null;

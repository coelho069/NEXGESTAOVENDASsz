import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function env(name: string) {
  return (process.env[name] ?? "").trim();
}

const url = env("NEXT_PUBLIC_SUPABASE_URL") || env("SUPABASE_URL");
const secret = env("SUPABASE_SECRET_KEY") || env("SUPABASE_SERVICE_ROLE_KEY");

export const supabaseAdmin: SupabaseClient | null =
  url && secret ? createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } }) : null;

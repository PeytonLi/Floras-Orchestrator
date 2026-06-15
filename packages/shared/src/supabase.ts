import { createClient, type SupabaseClient } from "@supabase/supabase-js";

// ============================================================
// Supabase client singleton (lazy + optional)
//
// Mirrors the Neo4j pattern: never required. When SUPABASE_URL +
// a key are absent, the orchestrator runs purely in-memory and the
// run store no-ops. Supabase is a best-effort durable mirror, not
// the hot path.
// ============================================================

let client: SupabaseClient | null = null;

export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.SUPABASE_URL &&
      (process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY),
  );
}

/** Returns the client, or null when Supabase isn't configured */
export function getSupabase(): SupabaseClient | null {
  if (client) return client;
  if (!isSupabaseConfigured()) return null;

  const url = process.env.SUPABASE_URL as string;
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY) as string;

  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}

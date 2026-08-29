/**
 * Lazy Supabase client — defers the 200KB @supabase/supabase-js import
 * until the first call, so it doesn't block initial paint / hydration.
 *
 * Use `getSupabase()` in async contexts instead of the static `supabase` export.
 * Use `isSupabaseConfigured` (no Supabase dependency) for config checks.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

let _client: SupabaseClient | null = null;
let _promise: Promise<SupabaseClient> | null = null;

export function getSupabase(): Promise<SupabaseClient> {
  if (_client) return Promise.resolve(_client);
  if (_promise) return _promise;

  _promise = import("@supabase/supabase-js").then(({ createClient }) => {
    _client = createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
    return _client;
  });

  return _promise;
}

import { createClient, FunctionsHttpError, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const isSupabaseConfigured = Boolean(url && anonKey);

if (import.meta.env.DEV && !isSupabaseConfigured) {
  console.warn(
    '[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Database features will be unavailable.'
  );
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : createClient('https://placeholder.supabase.co', 'placeholder-anon-key');

/**
 * Supabase's functions.invoke() throws a FunctionsHttpError with a generic
 * message ("Edge Function returned a non-2xx status code") when a function
 * responds with a non-2xx status — the actual error body (e.g. our
 * `{ error, code }` JSON) is only available via `error.context`, a Response
 * object, and must be read separately.
 *
 * Use this helper anywhere you call `supabase.functions.invoke(...)` so
 * users and logs see the real reason (auth required, rate limited, no API
 * key, provider error, etc.) instead of the generic wrapper message.
 */
export async function getFunctionErrorMessage(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      if (body && typeof body === 'object' && 'error' in body && typeof body.error === 'string') {
        return body.error;
      }
    } catch {
      // Response body wasn't JSON — fall through to the generic message below.
    }
  }
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

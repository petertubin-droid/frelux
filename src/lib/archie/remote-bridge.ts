// =========================================================
// ARCHIE REMOTE BRIDGE (cutover 2026-09-12)
//
// ARCHIE Core lives on its own Supabase project (Frelukx,
// pjvtqkshewerpvggtgqx). The FRELUX app no longer proxies
// ARCHIE through its own project's edge functions — it calls
// ARCHIE directly at ARCHIE's home.
//
// Identity: the browser sends the user's FRELUX-issued session
// JWT. ARCHIE verifies it against FRELUX's public JWKS
// (cross-project owner identity, commit ead413f); owner
// authority is decided by profiles.role='admin' in ARCHIE's
// own database. Visitors (no session) reach the visitor path
// exactly as before.
//
// The anon key below is a PUBLIC publishable key — the same
// trust level as the Freluxtools anon key this app already
// embeds. It grants no privileges; ARCHIE's functions enforce
// their own owner gates.
// =========================================================

const ARCHIE_PROJECT_URL = 'https://pjvtqkshewerpvggtgqx.supabase.co';
const ARCHIE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBqdnRxa3NoZXdlcnB2Z2d0Z3F4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyMTk1ODAsImV4cCI6MjEwMjc5NTU4MH0.pVMRrx9rEpzMz6RPQMuhdI5to5PxjaN-TFvsZnh886Q';

export interface ArchieBridgeResponse<T = unknown> {
  data: T | null;
  error: { message: string } | null;
}

/**
 * Create an invoker for ARCHIE's own project. The access-token
 * getter is injected by the caller (avoids a circular import
 * with the supabase client module).
 */
export function createArchieInvoker(
  getAccessToken: () => Promise<string | null>,
) {
  return async function invokeArchie<T = unknown>(
    functionName: string,
    options: { body?: unknown } = {},
  ): Promise<ArchieBridgeResponse<T>> {
    try {
      const token = await getAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        apikey: ARCHIE_ANON_KEY,
      };
      if (token) headers['Authorization'] = 'Bearer ' + token;

      const body =
        options.body === undefined ? undefined : JSON.stringify(options.body);

      const res = await fetch(
        ARCHIE_PROJECT_URL + '/functions/v1/' + functionName,
        {
          method: 'POST',
          headers,
          ...(body !== undefined ? { body } : {}),
        },
      );

      if (!res.ok) {
        let message = 'ARCHIE ' + functionName + ' error (' + res.status + ')';
        try {
          const errBody = await res.json();
          if (errBody && typeof errBody.error === 'string') {
            message = errBody.error;
          } else if (errBody && typeof errBody.message === 'string') {
            message = errBody.message;
          }
        } catch {
          // Non-JSON error body — keep the default message.
        }
        return { data: null, error: { message } };
      }

      const data = (await res.json()) as T;
      return { data, error: null };
    } catch (e) {
      return {
        data: null,
        error: { message: e instanceof Error ? e.message : 'Network error' },
      };
    }
  };
}

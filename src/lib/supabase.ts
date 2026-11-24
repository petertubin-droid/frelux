import {
  createClient,
  FunctionsHttpError,
  type SupabaseClient,
} from "@supabase/supabase-js";

import { staysOnSupabase } from "@/lib/edge/supabase-only";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

/**
 * Edge functions run on the Cloudflare Worker, not Supabase.
 *
 * Every `supabase.functions.invoke()` is rewritten from
 * `<project>/functions/v1/<name>` to `<edge base>/<name>`, keeping the same
 * headers, so function traffic stops consuming Supabase's invocation quota.
 * The Worker runs the ported functions itself and proxies the rest back to
 * Supabase, so an unported name still works while its wave lands.
 *
 * Three kinds of function are never sent to the Worker at all: AI functions
 * (it does not deploy them), anything over the free tier's 10 ms CPU budget,
 * and anything that would need a Workers Paid feature. Those keep calling
 * Supabase directly; see src/lib/edge/supabase-only.ts.
 *
 * Production defaults to the Worker's api host; set VITE_EDGE_FUNCTIONS_URL to
 * override it, or to an empty string to call Supabase directly.
 */
const FUNCTIONS_MARKER = "/functions/v1/";

export function edgeFunctionsBase(): string {
  const configured = import.meta.env.VITE_EDGE_FUNCTIONS_URL;
  const raw =
    typeof configured === "string"
      ? configured
      : import.meta.env.PROD
        ? "https://api.freluxtools.com/api/fn"
        : "";
  return raw.replace(/\/+$/, "");
}

/** Rewrite a Supabase function URL to the edge base; anything else is untouched. */
export function rewriteFunctionUrl(
  href: string,
  projectUrl: string,
  base: string,
): string {
  if (!base) return href;
  const at = href.indexOf(FUNCTIONS_MARKER);
  if (at < 0) return href;
  if (projectUrl && !href.startsWith(projectUrl)) return href;
  const rest = href.slice(at + FUNCTIONS_MARKER.length);
  // AI, CPU-heavy and paid-tier names stay on Supabase; the Worker is not a
  // relay for them.
  const name = rest.split(/[/?#]/)[0];
  if (staysOnSupabase(name)) return href;
  return `${base}/${rest}`;
}

const EDGE_FUNCTIONS_BASE = edgeFunctionsBase();

/**
 * fetch wrapper handed to every client: it rewrites function calls to the
 * Cloudflare Worker edge base, falling back to direct Supabase invocation if
 * the edge hop is unreachable, blocked, or returns a 502/503 gateway error.
 * Postgres, auth and storage requests are untouched.
 */
export const edgeFunctionsFetch: typeof fetch = async (input, init) => {
  if (!EDGE_FUNCTIONS_BASE) return fetch(input, init);
  const projectUrl = (url as string) || "";
  const href =
    input instanceof Request
      ? input.url
      : typeof input === "string"
        ? input
        : input.toString();
  const target = rewriteFunctionUrl(href, projectUrl, EDGE_FUNCTIONS_BASE);
  if (target === href) return fetch(input, init);

  let fallbackInput: RequestInfo | URL = input;
  let edgeInput: RequestInfo | URL = target;
  if (input instanceof Request) {
    try {
      fallbackInput = input.clone();
      edgeInput = new Request(target, input);
    } catch {
      edgeInput = new Request(target, input);
      fallbackInput = input;
    }
  }

  try {
    const res = await fetch(edgeInput, init);
    // 502 / 503 means the Worker cannot reach Supabase or is failing upstream:
    // fall back to direct Supabase invocation so user actions never fail.
    if ((res.status === 502 || res.status === 503) && target !== href) {
      return await fetch(fallbackInput, init);
    }
    return res;
  } catch {
    // Edge hop network failure, DNS issue, or CORS block: fall back directly to Supabase.
    return await fetch(fallbackInput, init);
  }
};

export const isSupabaseConfigured = Boolean(url && anonKey);

if (import.meta.env.DEV && !isSupabaseConfigured) {
  console.warn(
    "[supabase] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Database features will be unavailable.",
  );
}

export const supabase: SupabaseClient = isSupabaseConfigured
  ? createClient(url as string, anonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      global: { fetch: edgeFunctionsFetch },
    })
  : createClient("https://placeholder.supabase.co", "placeholder-anon-key");

/**
 * Derived client that sends the caller's client hash in the
 * `x-client-hash` request header. The RLS policies on
 * advanced_estimates, estimation_estimates and estimation_estimate_items
 * bind anonymous ownership to this header, supabase-js cannot set
 * per-request headers, so these flows go through a second client
 * instance created with a global header instead.
 *
 * The instance is cached per hash (the hash lives in localStorage and
 * does not change during a session). Auth state is shared with the main
 * client through localStorage; autoRefreshToken/detectSessionInUrl are
 * disabled so only the primary client refreshes tokens or parses the
 * URL session, avoiding duplicate refresh races.
 */
let hashBoundClient: SupabaseClient | null = null;
let hashBoundClientHash: string | null = null;

export function supabaseWithClientHash(clientHash: string): SupabaseClient {
  if (!isSupabaseConfigured) return supabase;
  if (hashBoundClient && hashBoundClientHash === clientHash)
    return hashBoundClient;
  hashBoundClient = createClient(url as string, anonKey as string, {
    auth: {
      persistSession: true,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    global: {
      headers: { "x-client-hash": clientHash },
      fetch: edgeFunctionsFetch,
    },
  });
  hashBoundClientHash = clientHash;
  return hashBoundClient;
}

/**
 * Supabase's functions.invoke() throws a FunctionsHttpError with a generic
 * message ("Edge Function returned a non-2xx status code") when a function
 * responds with a non-2xx, the actual error body (e.g. our
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
      if (
        body &&
        typeof body === "object" &&
        "error" in body &&
        typeof body.error === "string"
      ) {
        return body.error;
      }
    } catch {
      // Response body wasn't JSON, fall through to the generic message below.
    }
  }
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}

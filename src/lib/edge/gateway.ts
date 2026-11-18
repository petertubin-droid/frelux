/**
 * Browser calls to Supabase edge functions, routed through the FRELUX Worker.
 *
 * `/api/fn/:name` on the file Worker forwards to the same function, so the app
 * gains an edge hop for cached public GETs and one origin for everything else.
 * Every call returns `null` when the Worker is unreachable or not configured,
 * and the caller then uses Supabase directly: the gateway is an improvement,
 * never a dependency.
 */
const WORKER_BASE = (
  (import.meta.env.VITE_R2_WORKER_URL as string | undefined) ?? ""
)
  .trim()
  .replace(/\/+$/, "");

const ANON_KEY =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? "";

/** How long the gateway gets before the direct call takes over. */
const EDGE_TIMEOUT_MS = 4000;

export const edgeGatewayConfigured = Boolean(WORKER_BASE);

export interface EdgeInvokeResult<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * One attempt through the gateway. Returns null whenever the edge should not
 * answer for us, which is the signal to fall back rather than to fail.
 *
 * `cacheable` asks for a `GET`, which is the only shape the Worker caches; the
 * call is sent as a POST otherwise because Supabase functions read a body.
 */
export async function invokeAtEdge<T>(
  name: string,
  body: Record<string, unknown>,
  options: { accessToken?: string; cacheable?: boolean } = {},
): Promise<EdgeInvokeResult<T> | null> {
  if (!WORKER_BASE) return null;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), EDGE_TIMEOUT_MS);
  const headers: Record<string, string> = {
    "content-type": "application/json",
  };
  if (ANON_KEY) headers.apikey = ANON_KEY;
  if (options.accessToken)
    headers.authorization = `Bearer ${options.accessToken}`;

  try {
    const method = options.cacheable ? "GET" : "POST";
    const response = await fetch(
      `${WORKER_BASE}/api/fn/${encodeURIComponent(name)}`,
      {
        method,
        headers,
        body: method === "GET" ? undefined : JSON.stringify(body),
        signal: controller.signal,
      },
    );
    // 502/503 mean the Worker could not reach Supabase: use the direct path.
    // 401/403 mean the function wants a session the edge round trip cannot
    // carry, so the direct Supabase client answers instead of failing the page.
    if (
      response.status === 502 ||
      response.status === 503 ||
      response.status === 401 ||
      response.status === 403
    )
      return null;
    const payload = (await response.json().catch(() => null)) as
      | (T & { error?: string })
      | null;
    if (!response.ok) {
      return {
        ok: false,
        error:
          (payload && typeof payload === "object" && "error" in payload
            ? String(payload.error)
            : "") || `Request failed (${response.status})`,
      };
    }
    return { ok: true, data: (payload ?? undefined) as T | undefined };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

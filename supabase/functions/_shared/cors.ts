// =========================================================
// Shared CORS helpers for Supabase Edge Functions
// =========================================================

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

export function handleCors(req: Request): Response | null {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
}

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      ...corsHeaders,
      ...extraHeaders,
    },
  });
}

export function errorResponse(
  message: string,
  status = 400,
  extraHeaders: Record<string, string> = {},
): Response {
  return jsonResponse({ error: message }, status, extraHeaders);
}

export function rateLimitedResponse(resetAt: number): Response {
  return new Response(
    JSON.stringify({ error: "Too many requests. Please try again later." }),
    {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
        "Retry-After": String(Math.ceil((resetAt - Date.now()) / 1000)),
        "X-RateLimit-Remaining": "0",
      },
    },
  );
}

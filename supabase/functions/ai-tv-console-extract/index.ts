import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { serveWithCors } from "../_shared/serve.ts";
import { AiGateway } from "../_shared/ai-gateway.ts";

const headers = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-Client-Hash",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });

/** Read the model's JSON even when it arrives fenced or with prose around it. */
function parseJsonLoose(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  const candidates = [trimmed];
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  const first = trimmed.indexOf("{");
  const last = trimmed.lastIndexOf("}");
  if (first !== -1 && last > first)
    candidates.push(trimmed.slice(first, last + 1));
  for (const candidate of candidates) {
    try {
      const value = JSON.parse(candidate);
      if (value && typeof value === "object" && !Array.isArray(value)) {
        return value as Record<string, unknown>;
      }
    } catch {
      // try the next shape
    }
  }
  return null;
}

serveWithCors(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers });
  if (req.method !== "POST")
    return json({ error: "POST required", code: "METHOD_NOT_ALLOWED" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const apiKey =
    Deno.env.get("GEMINI_API_KEY") ?? Deno.env.get("GOOGLE_AI_API_KEY") ?? "";
  if (!supabaseUrl || !anonKey || !serviceKey || !apiKey) {
    return json(
      {
        error: "Image parsing is not configured on the server.",
        code: "NOT_CONFIGURED",
      },
      503,
    );
  }

  const authorization = req.headers.get("Authorization") ?? "";
  if (!authorization.startsWith("Bearer "))
    return json(
      {
        error: "Sign in and subscribe to use AI image parsing.",
        code: "AUTH_REQUIRED",
      },
      401,
    );
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authorization } },
  });
  const { data: userData, error: authError } = await userClient.auth.getUser();
  if (authError || !userData.user)
    return json(
      { error: "Your session could not be verified.", code: "AUTH_REQUIRED" },
      401,
    );

  const adminClient = createClient(supabaseUrl, serviceKey);
  const [{ data: adminRole }, { data: paid }] = await Promise.all([
    adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .eq("role", "admin")
      .maybeSingle(),
    adminClient
      .from("user_paid_status")
      .select("is_paid, plan, paid_until")
      .eq("user_id", userData.user.id)
      .maybeSingle(),
  ]);
  const active =
    !!paid?.is_paid &&
    (!paid.paid_until || Date.parse(paid.paid_until) > Date.now());
  const tier = String(paid?.plan ?? "").toLowerCase();
  const proOrAbove = ["pro", "premium", "enterprise"].includes(tier);
  if (!adminRole && !(active && proOrAbove)) {
    return json(
      {
        error:
          "Active Pro or higher subscription required for AI image parsing.",
        code: "PRO_REQUIRED",
      },
      403,
    );
  }

  let body: { imageDataUrl?: unknown };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body.", code: "INVALID_BODY" }, 400);
  }
  const image = typeof body.imageDataUrl === "string" ? body.imageDataUrl : "";
  const match = image.match(
    /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=]+)$/,
  );
  if (!match || image.length > 8_000_000)
    return json(
      {
        error: "Upload a JPEG, PNG or WebP image up to 6 MB.",
        code: "INVALID_IMAGE",
      },
      400,
    );

  const gateway = new AiGateway(supabaseUrl, serviceKey, anonKey);
  let reservation;
  try {
    reservation = await gateway.checkAndReserve(req, {
      featureKey: "tv_console_ai_design",
      modelName: "gemini-3.6-flash",
      promptChars: image.length,
    });
  } catch (error) {
    return json(
      {
        error:
          error instanceof Error
            ? error.message
            : "AI usage could not be authorized.",
        code: "AI_ACCESS_DENIED",
      },
      403,
    );
  }

  const started = Date.now();
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType: match[1], data: match[2] } },
                {
                  text: `You are only an information extractor, not a designer or engineer. Inspect this image for a TV/media console and estimate visible external cabinet dimensions in millimetres. Do not infer hidden structure, material strength, safe loads, or code compliance. Return JSON only: {"consoleVisible": boolean, "widthMm": number|null, "heightMm": number|null, "depthMm": number|null, "confidence": "low"|"medium"|"high", "notes": string[]}. Dimensions inferred from a photo are rough visual estimates; if scale is unavailable, use null rather than inventing a precise measurement. No BOM or design recommendation.`,
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 500,
            responseMimeType: "application/json",
          },
        }),
      },
    );
    if (!response.ok)
      throw new Error(`Vision provider returned ${response.status}`);
    const payload = await response.json();
    const text =
      payload?.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? "")
        .join("") ?? "";
    // Models wrap JSON in code fences or add a sentence before it often enough
    // that a bare JSON.parse turned readable replies into "vision failed".
    const parsed = parseJsonLoose(text);
    if (!parsed) throw new Error("Vision provider returned unreadable JSON");
    const safe = (n: unknown) =>
      typeof n === "number" && Number.isFinite(n) && n >= 100 && n <= 10000
        ? Math.round(n)
        : null;
    // A photograph with no console in it must not return dimensions: the model
    // sometimes reports plausible numbers for furniture that is not there.
    const consoleVisible = parsed.consoleVisible === true;
    const dimension = (n: unknown) => (consoleVisible ? safe(n) : null);
    const notes = Array.isArray(parsed.notes)
      ? parsed.notes.filter((x: unknown) => typeof x === "string").slice(0, 5)
      : [];
    const result = {
      consoleVisible,
      widthMm: dimension(parsed.widthMm),
      heightMm: dimension(parsed.heightMm),
      depthMm: dimension(parsed.depthMm),
      confidence: ["low", "medium", "high"].includes(parsed.confidence)
        ? parsed.confidence
        : "low",
      notes: consoleVisible
        ? notes
        : [
            ...notes,
            "No TV console or media unit was identified in this image.",
          ],
      requiresUserConfirmation: true,
    };
    await gateway.finalize(reservation, {
      status: "success",
      outputChars: JSON.stringify(result).length,
      durationMs: Date.now() - started,
    });
    return json({ extraction: result });
  } catch (error) {
    await gateway.finalize(reservation, {
      status: "failed",
      errorMessage:
        error instanceof Error ? error.message : "Vision extraction failed",
      // The log keeps the provider's own words; the user gets the mapped text.
      durationMs: Date.now() - started,
    });
    return json(
      {
        error:
          "Could not read dimensions from that image. Choose a template or enter dimensions manually.",
        code: "VISION_FAILED",
      },
      502,
    );
  }
});

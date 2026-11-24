import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitHeaders,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";
import { serveAi } from "../_shared/serve-ai.ts";
import {
  callGeminiApi,
  cleanJsonFence,
  getGeminiApiKey,
} from "../_shared/gemini.ts";

const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PreviewRequest {
  imageDataUrl?: string;
  roomDescription?: string;
  targetColors: Array<{ name: string; hex: string }>;
  roomType?: string;
  lightingCondition?: string;
  mood?: string;
  style?: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function getAiConfig(
  supabase: ReturnType<typeof createClient>,
): Promise<{ ai_enabled: boolean; apiKey: string }> {
  let ai_enabled = true;
  try {
    const { data } = await supabase
      .from("site_settings")
      .select("ai_enabled")
      .limit(1)
      .maybeSingle();
    if (data && typeof data.ai_enabled === "boolean") {
      ai_enabled = data.ai_enabled;
    }
  } catch {
    // Keep default true if query fails
  }

  const apiKey = getGeminiApiKey();

  return {
    ai_enabled,
    apiKey,
  };
}

function extractBase64FromDataUrl(dataUrl: string): {
  data: string;
  mimeType: string;
} {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return { data: dataUrl, mimeType: "image/jpeg" };
  return { data: match[2], mimeType: match[1] };
}

async function callGeminiForPreview(
  apiKey: string,
  req: PreviewRequest,
): Promise<{
  previewDescription: string;
  colorSuggestions: Array<{
    hex: string;
    name: string;
    reasoning: string;
    coverageArea: string;
  }>;
  applicationTips: string[];
}> {
  const colors = (req.targetColors || [])
    .map((c) => `${c.name || "Color"} (${c.hex || "#CCCCCC"})`)
    .join(", ");
  const context = [
    req.roomType ? `Room type: ${req.roomType}` : "",
    req.lightingCondition ? `Lighting: ${req.lightingCondition}` : "",
    req.mood ? `Desired mood: ${req.mood}` : "",
    req.style ? `Interior style: ${req.style}` : "",
    req.roomDescription ? `Room description: ${req.roomDescription}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const textPrompt = `You are an expert interior designer and color consultant for FRELUX.
The user wants to preview how these paint colors would look in their room:

Colors to preview: ${colors}

Room context:
${context}

${req.imageDataUrl ? "The user has uploaded a photo of their room." : "No photo uploaded — analyze based on the description."}

Provide a JSON response with:
{
  "previewDescription": "Detailed description of how the room would look with each color, considering lighting and room type. Describe the visual transformation.",
  "colorSuggestions": [
    {
      "hex": "#RRGGBB",
      "name": "Color name",
      "reasoning": "Why this color works for this room — consider lighting, mood, and style",
      "coverageArea": "Recommended surface for this color (walls, accent wall, trim, ceiling)"
    }
  ],
  "applicationTips": ["Specific tips for applying this color — primer needs, number of coats, finish type, surface preparation"]
}`;

  let parts: Array<{
    text?: string;
    inlineData?: { mimeType: string; data: string };
  }>;
  if (req.imageDataUrl) {
    const { data, mimeType } = extractBase64FromDataUrl(req.imageDataUrl);
    parts = [{ text: textPrompt }, { inlineData: { mimeType, data } }];
  } else {
    parts = [{ text: textPrompt }];
  }

  const { text } = await callGeminiApi({
    apiKey,
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.8,
      topP: 0.9,
      maxOutputTokens: 2000,
      responseMimeType: "application/json",
    },
  });

  const cleanText = cleanJsonFence(text);
  try {
    return JSON.parse(cleanText);
  } catch {
    return {
      previewDescription: cleanText,
      colorSuggestions: [],
      applicationTips: [],
    };
  }
}

serveAi(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Rate limit: 20 AI requests per minute per user/IP
  const rlKey = await getRateLimitKey(req);
  const rl = checkRateLimit(rlKey, RATE_LIMITS.AI);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        error: "Too many requests. Please try again later.",
        code: "RATE_LIMITED",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
          ...rateLimitHeaders(rl.remaining, rl.resetAt),
        },
      },
    );
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { error: "Method not allowed", code: "METHOD_NOT_ALLOWED" },
      405,
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

    if (!supabaseUrl || !serviceKey) {
      return jsonResponse(
        { error: "Server not configured", code: "SERVER_NOT_CONFIGURED" },
        500,
      );
    }

    let body: PreviewRequest;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { error: "Invalid JSON body", code: "INVALID_BODY" },
        400,
      );
    }

    if (
      !body.targetColors ||
      !Array.isArray(body.targetColors) ||
      body.targetColors.length === 0
    ) {
      return jsonResponse(
        { error: "At least one target color is required", code: "BAD_REQUEST" },
        400,
      );
    }

    const adminSupabase = createClient(supabaseUrl, serviceKey);
    const config = await getAiConfig(adminSupabase);
    if (!config.ai_enabled) {
      return jsonResponse(
        { error: "AI features are currently disabled", code: "AI_DISABLED" },
        403,
      );
    }
    if (!config.apiKey) {
      return jsonResponse(
        {
          error: "AI service not configured with an API key",
          code: "NO_API_KEY",
        },
        503,
      );
    }

    const result = await callGeminiForPreview(config.apiKey, body);
    return jsonResponse({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("AI Color Preview error:", message);
    return jsonResponse({ error: message, code: "INTERNAL_ERROR" }, 500);
  }
}, "ai_color_preview");

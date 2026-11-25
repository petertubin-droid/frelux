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

interface ColorSuggestion {
  hex: string;
  name: string;
  reasoning: string;
  coverageArea: string;
  finish?: string;
}

interface PreviewResult {
  previewImageUrl?: string;
  previewDescription: string;
  decorAdvice?: string;
  colorSuggestions: ColorSuggestion[];
  applicationTips: string[];
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

  return { ai_enabled, apiKey: getGeminiApiKey() };
}

function extractBase64FromDataUrl(dataUrl: string): {
  data: string;
  mimeType: string;
} {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) throw new Error("Upload a valid JPEG, PNG or WebP room photo.");
  return { data: match[2], mimeType: match[1] };
}

function extractJsonFromText<T>(text: string): T | null {
  let clean = text.trim();
  const fenceMatch = clean.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    clean = fenceMatch[1].trim();
  } else {
    const firstOpen = clean.indexOf("{");
    const lastClose = clean.lastIndexOf("}");
    if (firstOpen !== -1 && lastClose > firstOpen) {
      clean = clean.slice(firstOpen, lastClose + 1);
    }
  }
  clean = clean.replace(/,\s*([\]}])/g, "$1");
  try {
    return JSON.parse(clean) as T;
  } catch {
    return null;
  }
}

async function generateDecoratedRoomImage(
  apiKey: string,
  imagePrompt: string,
  imageDataUrl?: string,
): Promise<string | null> {
  // The image-generation model supports both new room generation and edits
  // using the supplied room photograph as a visual input.
  const models = [
    Deno.env.get("GEMINI_IMAGE_MODEL") || "gemini-3.1-flash-image",
    "gemini-2.5-flash-image",
    "gemini-2.0-flash-exp",
  ];
  const uniqueModels = [...new Set(models)];

  for (const model of uniqueModels) {
    try {
      const parts: Array<Record<string, unknown>> = [];
      if (imageDataUrl) {
        const { data, mimeType } = extractBase64FromDataUrl(imageDataUrl);
        parts.push({ inlineData: { mimeType, data } });
        parts.push({
          text: `Edit the user's actual room photograph, preserving its architecture, camera angle, windows, doors, and room layout. Apply the paint colors and decor described here, then return a photorealistic decorated-room image: ${imagePrompt}`,
        });
      } else {
        parts.push({
          text: `Generate a photorealistic interior room image based on this design. ${imagePrompt}`,
        });
      }

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts }],
            generationConfig: {
              temperature: 0.7,
              responseModalities: ["IMAGE", "TEXT"],
            },
          }),
          signal: AbortSignal.timeout(15_000),
        },
      );

      if (!response.ok) {
        // Log only the model/status, never request credentials or image data.
        console.warn("Color preview image model unavailable", model, response.status);
        continue;
      }

      const data = await response.json();
      const responseParts = data?.candidates?.[0]?.content?.parts ?? [];
      const imagePart = responseParts.find(
        (part: { inlineData?: { data?: string; mimeType?: string } }) =>
          typeof part.inlineData?.data === "string" &&
          typeof part.inlineData?.mimeType === "string",
      );
      if (imagePart?.inlineData?.data) {
        return `data:${imagePart.inlineData.mimeType};base64,${imagePart.inlineData.data}`;
      }
    } catch (error) {
      console.warn(
        "Color preview image generation attempt failed",
        model,
        error instanceof Error ? error.message : "unknown error",
      );
    }
  }

  return null;
}

async function callGeminiForPreview(
  apiKey: string,
  req: PreviewRequest,
  adminSupabase: ReturnType<typeof createClient>,
): Promise<PreviewResult> {
  const colors = req.targetColors
    .map((color) => `${color.name || "Color"} (${color.hex})`)
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

  const prompt = `You are a practical interior designer and paint consultant. Create a specific design for the user's room using the exact requested paint colors.
Colors: ${colors}
Room context:
${context || "No additional room details supplied. State any assumptions briefly."}
${req.imageDataUrl ? "Analyze the uploaded photograph: identify visible wall surfaces, windows/light direction, flooring and furniture. Ground advice in visible details; do not invent hidden room features." : "No photo was supplied. Make a practical proposal from the stated context and clearly label assumptions."}

Requirements:
- Give actionable advice, not generic promotional prose. Avoid stock phrases such as “Imagine your room transformed into a sanctuary.”
- Assign each selected color to a specific surface and explain why; use the exact hex and color name supplied.
- Explain how the stated lighting affects the colors, and distinguish visible facts from assumptions.
- Recommend practical, specific decor materials and finishes that work with the palette.
- Include preparation and paint-application steps, noting that product instructions and a test patch take priority.
- Create a detailed photorealistic image-generation prompt. If a photograph is provided, preserve its visible architecture and camera view while applying the proposed colors and decor.

Return valid JSON only with this schema:
{
  "previewDescription": "Practical, room-specific design and surface assignments",
  "decorAdvice": "Specific furniture, textile, floor and metal-finish recommendations",
  "colorSuggestions": [{"hex":"exact supplied hex","name":"exact supplied name","reasoning":"practical reason","coverageArea":"specific surface","finish":"suggested sheen"}],
  "applicationTips": ["concrete prep/application step"],
  "imagePrompt": "photorealistic room rendering prompt"
}`;

  const parts: Array<{
    text?: string;
    inlineData?: { mimeType: string; data: string };
  }> = [{ text: prompt }];
  if (req.imageDataUrl) {
    const { data, mimeType } = extractBase64FromDataUrl(req.imageDataUrl);
    parts.push({ inlineData: { mimeType, data } });
  }

  const { text } = await callGeminiApi({
    apiKey,
    contents: [{ parts }],
    generationConfig: {
      temperature: 0.6,
      topP: 0.9,
      maxOutputTokens: 2500,
      responseMimeType: "application/json",
    },
  });

  interface RawAiOutput {
    previewDescription?: string;
    decorAdvice?: string;
    colorSuggestions?: ColorSuggestion[];
    applicationTips?: string[];
    imagePrompt?: string;
  }
  const parsed = extractJsonFromText<RawAiOutput>(text);
  if (!parsed || typeof parsed.previewDescription !== "string" || !parsed.previewDescription.trim()) {
    throw new Error("AI returned an unreadable design response. Please try again.");
  }

  const validColors = new Map(req.targetColors.map((color) => [color.hex.toUpperCase(), color]));
  const suggestions = Array.isArray(parsed.colorSuggestions)
    ? parsed.colorSuggestions
        .filter((suggestion) => typeof suggestion?.hex === "string" && validColors.has(suggestion.hex.toUpperCase()))
        .map((suggestion) => ({
          ...suggestion,
          ...validColors.get(suggestion.hex.toUpperCase()),
          reasoning: String(suggestion.reasoning ?? ""),
          coverageArea: String(suggestion.coverageArea ?? ""),
        }))
    : [];

  const imagePrompt = typeof parsed.imagePrompt === "string" && parsed.imagePrompt.trim()
    ? parsed.imagePrompt
    : `Photorealistic interior ${req.roomType || "room"}, professionally decorated using ${colors}. ${context}.`;

  const result: PreviewResult = {
    previewDescription: parsed.previewDescription.trim(),
    decorAdvice: typeof parsed.decorAdvice === "string" ? parsed.decorAdvice.trim() : undefined,
    colorSuggestions: suggestions.length ? suggestions : req.targetColors.map((color) => ({
      ...color,
      reasoning: "Use this color only on the surface that best fits your room's light and layout; test a sample before painting.",
      coverageArea: "Confirm surface placement with a sample patch before full application",
    })),
    applicationTips: Array.isArray(parsed.applicationTips)
      ? parsed.applicationTips.filter((tip) => typeof tip === "string" && tip.trim()).map((tip) => tip.trim())
      : [],
  };

  const generatedImage = await generateDecoratedRoomImage(apiKey, imagePrompt, req.imageDataUrl);
  if (generatedImage) {
    result.previewImageUrl = generatedImage;
    try {
      const { data: base64, mimeType } = extractBase64FromDataUrl(generatedImage);
      const extension = mimeType === "image/jpeg" ? "jpg" : mimeType.split("/")[1] || "png";
      const filePath = `previews/${crypto.randomUUID()}.${extension}`;
      const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
      if (adminSupabase.storage) {
        const { error } = await adminSupabase.storage
          .from("brand-assets")
          .upload(filePath, bytes, { contentType: mimeType, upsert: false });
        if (!error) {
          const { data } = adminSupabase.storage.from("brand-assets").getPublicUrl(filePath);
          if (data?.publicUrl) result.previewImageUrl = data.publicUrl;
        }
      }
    } catch (error) {
      console.warn("Could not store generated color preview image; returning inline image.", error);
    }
  }

  return result;
}

serveAi(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

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

    if (!Array.isArray(body?.targetColors) || body.targetColors.length === 0) {
      return jsonResponse(
        { error: "At least one target color is required", code: "BAD_REQUEST" },
        400,
      );
    }
    if (body.targetColors.length > 6 || body.targetColors.some((color) => !/^#[0-9a-f]{6}$/i.test(color.hex))) {
      return jsonResponse(
        { error: "Provide up to 6 colors using valid #RRGGBB values.", code: "BAD_REQUEST" },
        400,
      );
    }
    if (body.imageDataUrl) {
      if (!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/i.test(body.imageDataUrl)) {
        return jsonResponse({ error: "Upload a JPEG, PNG or WebP room photo.", code: "BAD_IMAGE" }, 400);
      }
      const approximateBytes = Math.floor((body.imageDataUrl.length * 3) / 4);
      if (approximateBytes > 4 * 1024 * 1024) {
        return jsonResponse({ error: "Room photo must be 4MB or smaller.", code: "IMAGE_TOO_LARGE" }, 413);
      }
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
        { error: "AI service not configured with an API key", code: "NO_API_KEY" },
        503,
      );
    }

    const result = await callGeminiForPreview(config.apiKey, body, adminSupabase);
    return jsonResponse({ result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("AI Color Preview error:", message);
    return jsonResponse({ error: message, code: "INTERNAL_ERROR" }, 500);
  }
}, "ai_color_preview");

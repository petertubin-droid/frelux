// =========================================================
// FRELUX AI LIVE CHAT — powered by GEMINI
// =========================================================
// Owner directive (2026-09-20): frelux AI features run on
// Gemini; ARCHIE is a separate product. Same contract as
// before (Admin AI settings + direct integrations): POST
// {question, clientId?} -> {result, engine} | {error}.
// Knowledge base from learn_articles is injected into the
// system instruction. Hourly per-client budget + request
// logging are preserved.
// =========================================================

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitHeaders,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";
import { serveWithCors } from "../_shared/serve.ts";

const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const MAX_REQUESTS_PER_HOUR = 20;

interface LiveChatRequest {
  question: string;
  clientId?: string;
  /** Visitor's market or country, when the page knows it. */
  market?: string;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function checkHourlyRateLimit(
  supabase: ReturnType<typeof createClient>,
  clientHash: string,
): Promise<{ allowed: boolean; count: number }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count, error } = await supabase
    .from("ai_request_log")
    .select("*", { count: "exact", head: true })
    .eq("client_hash", clientHash)
    .eq("request_type", "livechat")
    .gte("created_at", oneHourAgo);
  if (error) return { allowed: true, count: 0 };
  return { allowed: (count ?? 0) < MAX_REQUESTS_PER_HOUR, count: count ?? 0 };
}

async function logAiRequest(
  supabase: ReturnType<typeof createClient>,
  clientHash: string,
  status: "success" | "error" | "rate_limited",
  providerError?: string,
): Promise<void> {
  await supabase.from("ai_request_log").insert({
    request_type: "livechat",
    client_hash: clientHash,
    status,
    provider_error: providerError ?? null,
  });
}

async function fetchKnowledgeBase(
  supabase: ReturnType<typeof createClient>,
): Promise<string> {
  const { data } = await supabase
    .from("learn_articles")
    .select("title, excerpt, content, category_slug")
    .eq("status", "published")
    .limit(20);
  if (!data || data.length === 0) return "";
  return data
    .map(
      (a) =>
        `## ${a.title}\nCategory: ${a.category_slug}\n${a.excerpt ?? ""}\n${a.content.slice(0, 800)}`,
    )
    .join("\n\n---\n\n");
}

const SYSTEM_PROMPT = `You are the FRELUX assistant, the live chat helper on frelux.tools. FRELUX is a construction and property intelligence platform. Visitors are mostly builders, contractors, quantity surveyors and homeowners, so a wrong number costs them money.

What FRELUX can actually do. This is the complete list: never invent a tool beyond it, and never say a feature exists when it is not here.
- /cost-estimator for whole project cost breakdowns
- /build-to-roof-estimator for a full structure, foundation to roof
- /painting-estimator, /wall-finish-estimator, /finish-estimator and /tyrolene-estimator for finishes
- /tile-calculator for tiles and tiling materials
- /electrical for electrical material takeoff and circuit checks
- /plumbing for pipe, fittings and sanitary ware
- /electrical-conduit-wiring-estimator for conduit and wiring runs
- /solar-pv-estimator for solar and battery sizing
- /rainwater-gutter-soffit-cost-estimator, /water-tower-staging-estimator and /labour-estimator for the rest

Hard rules, in order of importance:
1. Never state a technical figure as fact unless it appears word for word in the knowledge base below. That covers paint coverage in square metres per litre, blocks per square metre, cement bags per cubic metre, mix ratios, cable sizes, pipe sizes, rates of coverage and waste allowances. If a visitor asks for one, name the calculator above that computes it and tell them why the number depends on their own inputs. A confident wrong constant is the worst thing you can produce.
2. Never quote a price, a price range or a cost per unit. Prices differ by market and change constantly. Point to the estimator.
3. Never invent a clause, standard or code number (BS, EN, NEC, NIS and so on). If it is not in the knowledge base, say you cannot confirm it and suggest they check with a licensed professional.
4. Never assume the country. Method, materials and units differ in Nigeria, the UK, the US and elsewhere, and metres against feet is a real source of error. If the visitor has not said where the work is, ask before giving method or quantity advice.
5. Structural, electrical, gas and working-at-height questions carry risk of injury. Explain the principle if you can, then say a licensed engineer or electrician must approve the actual design. Never tell someone a structure or installation is safe.
6. Stay inside the calculators and topics above. For anything else, redirect to WhatsApp support.

Style: 2 to 4 sentences. Direct, practical, no filler, no em dashes. Write like a knowledgeable site engineer who is careful about numbers.

Market context for this conversation: {{MARKET_CONTEXT}}

Knowledge base context from the website:

{{KNOWLEDGE_BASE}}

When the knowledge base answers the question, use it and follow its figures. When it does not, either ask for the missing input, point to the calculator that computes it, or say plainly that you cannot confirm the number.`;

serveWithCors(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  // Rate limit: per user/IP
  const rlKey = await getRateLimitKey(req);
  const rl = checkRateLimit(rlKey, RATE_LIMITS.AI);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
          "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
        },
      },
    );
  }
  const _rlHeaders = rateLimitHeaders(rl.remaining, rl.resetAt);

  let parsedBody: LiveChatRequest | null = null;

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: "Server not configured" }, 500);
    }
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    let body: LiveChatRequest;
    try {
      parsedBody = (await req.json()) as LiveChatRequest;
      body = parsedBody;
    } catch {
      return jsonResponse({ error: "Invalid JSON body" }, 400);
    }

    const question = String(body.question ?? "").trim();
    if (!question) {
      return jsonResponse({ error: "Question is required" }, 400);
    }
    const clientId = String(body.clientId ?? "anon").slice(0, 80);
    const clientHash = await sha256(clientId);

    // hourly per-client budget (same policy as before)
    const budget = await checkHourlyRateLimit(supabase, clientHash);
    if (!budget.allowed) {
      await logAiRequest(supabase, clientHash, "rate_limited");
      return jsonResponse(
        {
          error:
            "You've reached the hourly chat limit. Please try again later.",
        },
        429,
      );
    }

    // knowledge base injection (same source as before)
    const kb = await fetchKnowledgeBase(supabase);
    // A market the page supplies is stated; otherwise the prompt tells the
    // model to ask, so no answer silently assumes Nigeria.
    const statedMarket = String(body.market ?? "")
      .trim()
      .slice(0, 40);
    const marketContext = statedMarket
      ? `${statedMarket}. Use that market's units and methods, and say so when a figure is market specific.`
      : "not stated by the visitor. Ask which country the work is in before giving method, unit or quantity advice.";
    const systemPrompt = SYSTEM_PROMPT.replace(
      "{{MARKET_CONTEXT}}",
      marketContext,
    ).replace("{{KNOWLEDGE_BASE}}", kb);

    // ---- Gemini inference (frelux AI provider) ----
    const geminiKey = Deno.env.get("GEMINI_API_KEY");
    if (!geminiKey) {
      await logAiRequest(
        supabase,
        clientHash,
        "error",
        "GEMINI_API_KEY not configured",
      );
      return jsonResponse(
        {
          error:
            "The FRELUX assistant is briefly unavailable. Please try again shortly.",
        },
        503,
      );
    }

    let text = "";
    try {
      const geminiRes = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=" +
          geminiKey,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [
              { role: "user", parts: [{ text: question.slice(0, 4000) }] },
            ],
            generationConfig: { temperature: 0.5, maxOutputTokens: 1024 },
          }),
        },
      );
      if (geminiRes.ok) {
        const gem = await geminiRes.json();
        text = (gem?.candidates?.[0]?.content?.parts ?? [])
          .map((part: { text?: string }) => part?.text ?? "")
          .filter(Boolean)
          .join("")
          .trim();
      } else {
        console.error("[ai-livechat] Gemini HTTP " + geminiRes.status);
      }
    } catch (geminiErr) {
      console.error("[ai-livechat] Gemini call failed:", geminiErr);
    }

    if (!text) {
      await logAiRequest(supabase, clientHash, "error", "empty Gemini reply");
      return jsonResponse(
        { error: "The assistant produced no response. Please try again." },
        502,
      );
    }

    await logAiRequest(supabase, clientHash, "success");

    return jsonResponse({ result: text, engine: "gemini-3.6-flash" });
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Live chat error:", errorMsg);

    // (provider outage detail is already in the logged error string)
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
      if (supabaseUrl && serviceRoleKey) {
        const supabase = createClient(supabaseUrl, serviceRoleKey);
        const clientHash = await sha256(
          parsedBody?.clientId || crypto.randomUUID(),
        );
        await logAiRequest(
          supabase,
          clientHash,
          "error",
          errorMsg.slice(0, 500),
        );
      }
    } catch {
      // logging must never mask the original failure
    }

    return jsonResponse(
      {
        error: "Sorry, something went wrong. Please try again.",
      },
      500,
    );
  }
});

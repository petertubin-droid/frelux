// =========================================================
// SUPPORT CHAT — Frelux site support assistant
// =========================================================
// Owner directive (2026-09-20): frelux AI features run on
// GEMINI; ARCHIE is a separate product and is no longer the
// site assistant. Anonymous visitors AND logged-in users get
// product guidance (calculators, pricing, PRO marketplace,
// rewards). No account lookups, no personal data, no actions
// on the user's behalf — guidance only. Rate limited per
// client. Response contract matches the previous site chat:
// { reply?, error? }.
// =========================================================

import {
  checkRateLimit,
  getRateLimitKey,
  rateLimitHeaders,
  RATE_LIMITS,
} from "../_shared/rate-limit.ts";
import { serveWithCors } from "../_shared/serve.ts";

const CORS = {
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const GEMINI_MODEL = "gemini-3.6-flash";

const SYSTEM_PROMPT = `You are the Frelux Support Assistant — a friendly, concise product guide for Frelux, a Nigerian construction platform.

You help visitors with:
- How the construction calculators work (building costs, roofing, painting, POP, tiling, borehole, etc.)
- Pricing tiers, credits and subscriptions
- The PRO marketplace (finding pros, posting jobs) and worker channels
- Rewards and how the platform works generally

Rules:
- Answer with public product information only. Never look up, guess or discuss a specific user's account, projects, payments or personal data.
- You cannot perform actions (reset passwords, change plans, process payments). For those, point to the relevant page or to support.
- Be concise: a few short sentences, occasionally a short list. Use plain language.
- If you don't know something about Frelux, say so honestly instead of inventing features or prices.`;

interface ChatMessage {
  role: string;
  content: string;
}

function json(
  status: number,
  body: Record<string, unknown>,
  extra: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS, ...extra },
  });
}

function sanitizeHistory(
  history: unknown,
): Array<{ role: "user" | "model"; text: string }> {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (m): m is ChatMessage =>
        typeof m === "object" &&
        m !== null &&
        typeof (m as ChatMessage).content === "string" &&
        // accept both the old ("owner"/"archie") and new ("user"/"assistant") labels
        ["owner", "archie", "user", "assistant", "model"].includes(
          (m as ChatMessage).role ?? "",
        ),
    )
    .slice(-10)
    .map((m) => ({
      role:
        m.role === "owner" || m.role === "user"
          ? ("user" as const)
          : ("model" as const),
      text: m.content.slice(0, 2000),
    }));
}

async function callGemini(
  message: string,
  history: Array<{ role: "user" | "model"; text: string }>,
): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("NO_API_KEY");

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          ...history.map((m) => ({
            role: m.role,
            parts: [{ text: m.text }],
          })),
          { role: "user", parts: [{ text: message }] },
        ],
        generationConfig: { temperature: 0.5, maxOutputTokens: 800 },
      }),
    },
  );
  if (!res.ok) {
    throw new Error(`GEMINI_HTTP_${res.status}`);
  }
  const data = await res.json();
  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p?.text ?? "")
    .filter(Boolean)
    .join("")
    .trim();
  if (!text) throw new Error("EMPTY_RESPONSE");
  return text.slice(0, 2000);
}

serveWithCors(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") {
    return json(405, { error: "POST only." });
  }

  let payload: {
    message?: unknown;
    history?: unknown;
    clientId?: unknown;
  };
  try {
    payload = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body." });
  }

  // Rate limit per client id (falls back to IP). Anonymous-safe.
  const clientId =
    typeof payload.clientId === "string"
      ? payload.clientId.slice(0, 64)
      : undefined;
  const rlKey = getRateLimitKey(req, clientId);
  const rl = checkRateLimit(rlKey, RATE_LIMITS.AI);
  if (!rl.allowed) {
    return json(
      429,
      { error: "You're sending messages too quickly. Please wait a moment." },
      {
        ...rateLimitHeaders(rl.remaining, rl.resetAt),
        "Retry-After": String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
      },
    );
  }

  const message =
    typeof payload.message === "string" ? payload.message.trim() : "";
  if (!message) {
    return json(400, { error: "Message is required." });
  }
  if (message.length > 2000) {
    return json(400, { error: "Message is too long (2000 characters max)." });
  }

  try {
    const reply = await callGemini(message, sanitizeHistory(payload.history));
    return json(200, { reply });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg === "NO_API_KEY") {
      return json(503, {
        error: "The support assistant is not configured right now.",
      });
    }
    console.error("[support-chat] Gemini failure:", msg);
    return json(502, {
      error:
        "The assistant is unavailable right now. Please try again shortly.",
    });
  }
});

// Supabase Edge Function: archie-chat
// =========================================================
// FRELUX ARCHIE STAGE 1, INTELLIGENCE CORE (CHAT ENTRYPOINT)
//
// The conversational front door to the ARCHIE Intelligence
// Core. ARCHITECTURE (provider-independent):
//
//   ARCHIE CHAT CENTER (client)
//     → this function — ARCHIE INTELLIGENCE CORE
//       (auth, tool orchestration, validation, policy)
//     → ARCHIE AI INFERENCE LAYER (_shared/archie-ai)
//     → ARCHIE MODEL RUNTIME (own model — implementation
//       boundary, not implemented yet)
//       … with an optional, explicitly-labeled external
//       development adapter during the independence roadmap.
//
// HARD RULES:
//   * This function NEVER calls Gemini/OpenAI directly. All
//     inference goes through the ARCHIE AI abstraction.
//   * If no engine is operational, the response says so
//     honestly. ARCHIE never substitutes a provider silently.
//   * Tools below are ARCHIE's own capabilities
//     (provider-independent); the inference layer only routes
//     tool calls, it never owns them.
//   * Owner-only: caller's profile.role must be 'admin'.
//   * No secrets in, no secrets out.
// =========================================================

import { createClient, User } from "npm:@supabase/supabase-js@2.45.4";
import {
  resolveArchieRuntime,
  type ArchieInferenceRequest,
  type ArchieInferencePart,
  type ArchieToolSpec,
} from "../_shared/archie-ai/runtime.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });
}

// ---- shared service client --------------------------------
const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false },
});

// ---- request types ----------------------------------------
interface ChatTurn {
  role: "owner" | "archie";
  content: string;
}
interface ChatRequest {
  message: string;
  history?: ChatTurn[];
  attachments?: { name: string; type: string }[];
}

interface ToolRun {
  tool: string;
  ok: boolean;
  input: unknown;
  output: unknown;
  at: string;
}

// ---- sanitizer: keep credentials out of ARCHIE traffic ----
const SECRET_PATTERNS = [
  /sk-[A-Za-z0-9]{16,}/g,
  /AIza[A-Za-z0-9_\-]{20,}/g,
  /AQ\.[A-Za-z0-9_\-]{20,}/g,
  /eyJ[A-Za-z0-9_\-]{20,}\.[A-Za-z0-9_\-]{15,}/g,
];
function sanitize(text: string): string {
  let out = text;
  for (const p of SECRET_PATTERNS) out = out.replace(p, "[redacted]");
  return out;
}

// =========================================================
// ARCHIE TOOL REGISTRY (provider-independent)
// Real tools run against production data (read-only). Pending
// tools are declared NOT OPERATIONAL so ARCHIE answers
// honestly instead of faking. New ARCHIE capabilities
// register here — the core is not hardcoded around this list.
// =========================================================
interface ToolDef extends ArchieToolSpec {
  operational: boolean;
  execute?: (input: Record<string, unknown>) => Promise<unknown>;
}

async function count(table: string, filter?: [string, unknown]) {
  let q = db.from(table).select("id", { count: "exact", head: true });
  if (filter) q = q.eq(filter[0], filter[1]);
  const { count, error } = await q;
  if (error) return { error: error.message };
  return { count: count ?? 0 };
}

const TOOLS: ToolDef[] = [
  {
    name: "frelux_status",
    description:
      "Live FRELUX platform status: counts of user profiles, saved client estimates, active knowledge items, active ARCHIE domains, and ARCHIE internal agents grouped by lifecycle state.",
    parameters: { type: "object", properties: {}, required: [] },
    operational: true,
    execute: async () => {
      const [profiles, estimates, knowledge, domains, agents, events] =
        await Promise.all([
          count("profiles"),
          count("client_estimates"),
          count("frelux_knowledge_items", ["status", "ACTIVE"]),
          count("frelux_archie_domains", ["active", true]),
          db
            .from("frelux_archie_internal_agents")
            .select("status")
            .then(({ data }) => {
              const by: Record<string, number> = {};
              for (const a of data ?? [])
                by[a.status] = (by[a.status] ?? 0) + 1;
              return by;
            }),
          count("frelux_security_events"),
        ]);
      return {
        profiles,
        estimates,
        knowledge,
        domains,
        agents,
        security_events_total: events,
      };
    },
  },
  {
    name: "knowledge_search",
    description:
      "Search ARCHIE-owned approved knowledge (ACTIVE knowledge items) by keyword. Returns topic, capability, scope and a content excerpt.",
    parameters: {
      type: "object",
      properties: { query: { type: "string" } },
      required: ["query"],
    },
    operational: true,
    execute: async (input) => {
      const q = String(input.query ?? "").slice(0, 120);
      const { data, error } = await db
        .from("frelux_knowledge_items")
        .select("topic,capability,scope,content,confidence")
        .eq("status", "ACTIVE")
        .ilike("topic", `%${q}%`)
        .limit(5);
      if (error) return { error: error.message };
      return {
        results: (data ?? []).map((k) => ({
          topic: k.topic,
          capability: k.capability,
          scope: k.scope,
          confidence: k.confidence,
          excerpt: JSON.stringify(k.content).slice(0, 400),
        })),
      };
    },
  },
  {
    name: "archie_agent_status",
    description:
      "Inspect ARCHIE internal agents: role, display name, lifecycle status, task, and cost fields.",
    parameters: { type: "object", properties: {}, required: [] },
    operational: true,
    execute: async () => {
      const { data, error } = await db
        .from("frelux_archie_internal_agents")
        .select(
          "role,display_name,status,task,estimated_cost_cents,actual_cost_cents",
        )
        .order("created_date", { ascending: false })
        .limit(20);
      if (error) return { error: error.message };
      return { agents: data ?? [] };
    },
  },
  {
    name: "archie_domains",
    description:
      "List ARCHIE knowledge domains (the registry of what ARCHIE knows and is learning), with risk class and active state.",
    parameters: { type: "object", properties: {}, required: [] },
    operational: true,
    execute: async () => {
      const { data, error } = await db
        .from("frelux_archie_domains")
        .select("key,label,risk_class,active,is_core")
        .order("is_core", { ascending: false })
        .limit(50);
      if (error) return { error: error.message };
      return { domains: data ?? [] };
    },
  },
  // ---- adapter boundaries: declared, honestly PENDING ----
  {
    name: "web_intelligence",
    description: "Live web search and crawl intelligence. NOT OPERATIONAL YET.",
    parameters: { type: "object", properties: {}, required: [] },
    operational: false,
  },
  {
    name: "market_intelligence",
    description:
      "Regional building-material market price intelligence. NOT OPERATIONAL YET.",
    parameters: { type: "object", properties: {}, required: [] },
    operational: false,
  },
  {
    name: "code_intelligence",
    description: "Authorized FRELUX codebase analysis. NOT OPERATIONAL YET.",
    parameters: { type: "object", properties: {}, required: [] },
    operational: false,
  },
  {
    name: "sentry_diagnostics",
    description: "Sentry error and diagnostics review. NOT OPERATIONAL YET.",
    parameters: { type: "object", properties: {}, required: [] },
    operational: false,
  },
  {
    name: "property_intelligence",
    description:
      "Property analysis and location intelligence. NOT OPERATIONAL YET.",
    parameters: { type: "object", properties: {}, required: [] },
    operational: false,
  },
];

// Declare only OPERATIONAL tools to whichever engine serves
// the request. Pending tools are explained to the model via
// the system instruction instead.
function activeToolSpecs(): ArchieToolSpec[] {
  return TOOLS.filter((t) => t.operational).map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));
}

const PENDING_TOOL_NOTE = TOOLS.filter((t) => !t.operational)
  .map((t) => `${t.name} (${t.description})`)
  .join("; ");

const SYSTEM_PROMPT = `You are ARCHIE, the personal AI intelligence system of the FRELUX platform, speaking privately with the OWNER of FRELUX.
You are a capable, direct, warm assistant: conversational, never robotic, never a support chatbot.

Operating rules:
- You can call tools to inspect REAL platform state. Only use tools that are declared. Capabilities not declared to you are NOT OPERATIONAL YET: ${PENDING_TOOL_NOTE}. If the Owner asks for those, say plainly they are not yet operational and offer the closest real alternative.
- NEVER invent data, numbers, or statuses. If a tool result is missing or errored, say so.
- The Owner is the final authority. Protected operations (money, security changes, production changes) are NEVER performed from chat; you may analyze and prepare, and the Owner authorizes through the proper dashboard workflow.
- Keep answers concise and useful. Use short paragraphs. No filler.
- Never echo credentials, API keys, or tokens. Never ask for passwords.`;

// ---- main handler ----------------------------------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });

  // 1. Authenticate + verify Owner (admin role)
  const authHeader = req.headers.get("Authorization") ?? "";
  if (!authHeader.startsWith("Bearer "))
    return json(401, { error: "Not authenticated" });
  const anon = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data: userData, error: userError } = await anon.auth.getUser();
  const user = userData?.user as User | undefined;
  if (userError || !user) return json(401, { error: "Not authenticated" });

  const { data: profile } = await db
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "admin") {
    return json(403, { error: "ARCHIE is Owner-only" });
  }

  // 2. Parse + validate request
  let body: ChatRequest;
  try {
    body = await req.json();
  } catch {
    return json(400, { error: "Invalid JSON body" });
  }
  const message = sanitize(String(body.message ?? "").slice(0, 8000)).trim();
  if (!message) return json(400, { error: "Message is required" });
  const history = (body.history ?? [])
    .slice(-20)
    .map((t) => ({
      role: t.role,
      content: sanitize(String(t.content ?? "").slice(0, 4000)),
    }));

  // 3. Resolve the inference engine through the ARCHIE AI
  //    abstraction. Never a direct provider call.
  const { runtime, engine } = resolveArchieRuntime({
    devAdapter: Deno.env.get("ARCHIE_DEV_ADAPTER"),
    geminiKey: Deno.env.get("GOOGLE_AI_API_KEY"),
  });
  if (!runtime) {
    return json(503, {
      error:
        "ARCHIE's own model runtime is an implementation boundary and is not operational yet. " +
        "No external provider is substituting for ARCHIE. Reasoning will begin when ARCHIE-native inference (or an explicitly enabled development adapter) is configured.",
      engine,
    });
  }

  // 4. UNDERSTAND -> SELECT -> EXECUTE -> VALIDATE -> RESPOND
  const attachmentsNote =
    body.attachments && body.attachments.length
      ? `\n\n[Owner attached ${body.attachments.length} file(s): ${body.attachments
          .map((a) => `${a.name} (${a.type})`)
          .join(
            ", ",
          )}. Analysis of file CONTENT is not yet operational; acknowledge what was attached honestly.]`
      : "";

  const request: ArchieInferenceRequest = {
    turns: [
      ...history.map((t) => ({
        role: t.role,
        parts: [{ text: t.content }] as ArchieInferencePart[],
      })),
      { role: "owner" as const, parts: [{ text: message + attachmentsNote }] },
    ],
    tools: activeToolSpecs(),
    systemInstruction: SYSTEM_PROMPT,
  };

  const toolRuns: ToolRun[] = [];
  try {
    let result = await runtime.generate(request);

    // Tool loop (max 3 hops)
    for (let hop = 0; hop < 3; hop++) {
      const call = result.parts.find((p) => p.toolCall)?.toolCall;
      if (!call) break;

      const tool = TOOLS.find((t) => t.name === call.name);
      if (!tool || !tool.operational || !tool.execute) {
        request.turns.push({ role: "archie", parts: result.parts });
        request.turns.push({
          role: "owner",
          parts: [
            {
              toolResult: {
                name: call.name,
                output: { error: "Tool is not operational yet" },
              },
            },
          ],
        });
        result = await runtime.generate(request);
        continue;
      }

      const output = await tool.execute(call.args ?? {});
      toolRuns.push({
        tool: tool.name,
        ok: true,
        input: call.args ?? {},
        output,
        at: new Date().toISOString(),
      });

      request.turns.push({ role: "archie", parts: result.parts });
      request.turns.push({
        role: "owner",
        parts: [{ toolResult: { name: tool.name, output } }],
      });
      result = await runtime.generate(request);
    }

    const text = result.parts
      .map((p) => p.text)
      .filter(Boolean)
      .join("")
      .trim();
    if (!text) {
      return json(502, {
        error: "ARCHIE produced no response text",
        engine: result.engine,
      });
    }
    return json(200, {
      reply: sanitize(text),
      toolRuns,
      engine: result.engine,
      pendingCapabilities: TOOLS.filter((t) => !t.operational).map(
        (t) => t.name,
      ),
    });
  } catch (err) {
    return json(502, {
      error:
        err instanceof Error ? sanitize(err.message) : "ARCHIE core failure",
      toolRuns,
      engine,
    });
  }
});

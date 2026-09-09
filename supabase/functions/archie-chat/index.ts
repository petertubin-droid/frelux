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
  execute?: (
    input: Record<string, unknown>,
    ctx: { userId: string },
  ) => Promise<unknown>;
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
  // ---- REAL website inspection: URL -> robots-aware fetch ->
  // structured extraction -> persisted ARCHIE ingestion ----
  {
    name: "web_intelligence",
    description:
      "Inspect a website URL: fetches the live page (robots.txt respected, private addresses blocked), extracts title/meta/headings/content/counts, and persists the inspection into the ARCHIE learning pipeline. Use whenever the Owner supplies a website URL or asks to inspect, review or analyze a website. Returns REAL data from the live response - report findings and recommendations from it.",
    parameters: {
      type: "object",
      properties: { url: { type: "string" } },
      required: ["url"],
    },
    operational: true,
    execute: async (input, ctx) => {
      const raw = String(input.url ?? "").trim();
      if (!raw) return { error: "url is required" };
      let u: URL;
      try {
        u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
      } catch {
        return { error: "That does not look like a valid URL." };
      }
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return { error: "Only http/https URLs can be inspected." };
      }
      if (isBlockedHost(u.hostname)) {
        return {
          error:
            "That host is not inspectable (private, reserved or non-public address).",
        };
      }

      // robots.txt (standard crawler behavior; unreachable => proceed)
      let blockedBy: string | null = null;
      try {
        const robotsRes = await fetchWithTimeout(
          `${u.origin}/robots.txt`,
          8000,
        );
        if (robotsRes.ok) {
          const rules = starDisallowRules(await robotsRes.text());
          blockedBy = robotsBlocks(rules, u.pathname + u.search);
        }
      } catch {
        /* no robots file: allowed */
      }
      if (blockedBy) {
        return {
          blocked: true,
          reason: `The site's robots.txt disallows this path (rule "${blockedBy}"). ARCHIE respects the site's crawl policy - nothing was fetched.`,
          url: u.href,
        };
      }

      const res = await fetchWithTimeout(u.href, 15000);
      const contentType = res.headers.get("content-type") ?? "";
      if (!res.ok) {
        return {
          error: `The site responded HTTP ${res.status} ${res.statusText}. Nothing was inspected.`,
          url: u.href,
        };
      }
      if (!/text\/html|application\/xhtml|text\/plain/.test(contentType)) {
        return {
          error: `The URL returned ${contentType || "an unknown content type"}, which is not inspectable as a page.`,
          url: u.href,
        };
      }
      const reader = res.body?.getReader();
      let html = "";
      if (reader) {
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          html += decoder.decode(value, { stream: true });
          if (html.length > 500_000) {
            await reader.cancel();
            break;
          }
        }
      } else {
        html = (await res.text()).slice(0, 500_000);
      }

      const report = extractSiteReport(html);
      const inspection = {
        url: u.href,
        final_url: res.url,
        https: res.url.startsWith("https://"),
        http_status: res.status,
        content_type: contentType,
        inspected_at: new Date().toISOString(),
        ...report,
      };

      // Persist into the ARCHIE learning pipeline (owner-owned)
      const { error: insErr } = await db
        .from("frelux_archie_ingestions")
        .insert({
          created_by: ctx.userId,
          input_type: "WEB_INTELLIGENCE",
          title: report.title || u.hostname,
          domain: u.hostname,
          source_ref: res.url,
          raw_text: report.content_excerpt,
          pipeline_state: "RECEIVED",
        });

      return {
        inspection,
        persisted_to_learning: insErr ? false : true,
        persistence_error: insErr ? insErr.message : undefined,
      };
    },
  },
  // ---- REAL market intelligence: configured FRELUX prices +
  // regional OBSERVED market data with provenance. Never
  // invented: empty regions return an honest empty state ----
  {
    name: "market_intelligence",
    description:
      "Regional building-material market price intelligence. Queries the configured FRELUX material price catalog and the frelux_archie_market_observations registry (observed prices/rates with source provenance) for a region and optional item. Returns REAL recorded data only - if nothing is recorded for a region, say so honestly and state which regions DO have observations.",
    parameters: {
      type: "object",
      properties: {
        region: {
          type: "string",
          description: "Region, state or country, e.g. 'Lagos', 'Nigeria'",
        },
        item: {
          type: "string",
          description: "Optional item filter, e.g. 'cement', 'paint'",
        },
      },
      required: ["region"],
    },
    operational: true,
    execute: async (input, ctx) => {
      const region = String(input.region ?? "")
        .trim()
        .slice(0, 80);
      const item = input.item ? String(input.item).trim().slice(0, 80) : null;
      if (!region) return { error: "region is required" };

      const obsQ = db
        .from("frelux_archie_market_observations")
        .select(
          "kind,region,item,value,currency,unit,price_kind,observed_at,confidence,source_ref",
        )
        .ilike("region", `%${region}%`)
        .order("observed_at", { ascending: false })
        .limit(100);
      const obsRes = item ? await obsQ.ilike("item", `%${item}%`) : await obsQ;
      if (obsRes.error) return { error: obsRes.error.message };
      const observations = obsRes.data ?? [];

      // Which regions actually have data (honest guidance)
      const regionsRes = await db
        .from("frelux_archie_market_observations")
        .select("region")
        .limit(500);
      const regionsWithData = [
        ...new Set((regionsRes.data ?? []).map((r) => r.region)),
      ];

      const catQ = db
        .from("material_prices")
        .select("name,category,unit,price,currency")
        .eq("is_active", true)
        .order("sort_order")
        .limit(50);
      const catRes = item ? await catQ.ilike("name", `%${item}%`) : await catQ;
      if (catRes.error) return { error: catRes.error.message };
      const configured_prices = catRes.data ?? [];

      const { error: insErr } = await db
        .from("frelux_archie_ingestions")
        .insert({
          created_by: ctx.userId,
          input_type: "TEXT",
          title: `Market intelligence query: ${region}${item ? ` / ${item}` : ""}`,
          domain: "market",
          region,
          source_ref: "archie:market_intelligence",
          raw_text: JSON.stringify({
            observations: observations.slice(0, 20),
            configured_prices,
          }).slice(0, 20_000),
          pipeline_state: "RECEIVED",
        });

      return {
        region_queried: region,
        item_filter: item,
        observed_market_data: observations,
        regions_with_observations: regionsWithData,
        configured_frelux_prices: configured_prices,
        note: "Observed data carries source provenance; configured prices are the deterministic FRELUX calculator catalog. Never present an unrecorded figure as fact.",
        persisted_to_learning: insErr ? false : true,
      };
    },
  },
  // ---- REAL code inspection: owner-supplied code OR FRELUX
  // repository files via the GitHub API. Deterministic security
  // findings + the actual code, so the reasoning layer analyzes
  // REAL material and reports actionable recommendations. ----
  {
    name: "code_intelligence",
    description:
      "Inspect real code. Pass `code` (text the Owner supplied) and/or `repo_path` (a file or directory in the FRELUX repository, e.g. 'src/lib/archie' or 'src/App.tsx'). Returns deterministic security findings (hardcoded secrets, eval, raw HTML injection, TODO markers) plus the code or directory listing itself. Analyze and report findings, then suggest improvements. Never invent file contents.",
    parameters: {
      type: "object",
      properties: {
        code: { type: "string" },
        repo_path: { type: "string" },
        question: { type: "string" },
      },
      required: [],
    },
    operational: true,
    execute: async (input, ctx) => {
      const code = input.code ? String(input.code).slice(0, 60_000) : null;
      const repoPath = input.repo_path
        ? String(input.repo_path)
            .replace(/^[\/.]+/, "")
            .slice(0, 200)
        : null;
      if (!code && !repoPath) {
        return {
          error:
            "Provide either `code` (the code to inspect) or `repo_path` (a FRELUX repository path).",
        };
      }

      const result: Record<string, unknown> = {};

      if (code) {
        result.findings = scanCode(code);
        result.code_supplied = {
          lines: code.split("\n").length,
          excerpt_chars: code.length,
        };
      }

      if (repoPath) {
        const repo = await fetchRepoFile(repoPath);
        if (repo.ok) {
          if (repo.file) {
            result.repository_file = {
              path: repo.file.path,
              size: repo.file.size,
              truncated: repo.truncated ?? false,
            };
            result.findings = scanCode(repo.file.content);
            result.code = repo.file.content;
          } else if (repo.listing) {
            result.repository_listing = repo.listing;
          }
        } else {
          result.repo_error = repo.error;
        }
      }

      // Persist coding knowledge into the ARCHIE learning pipeline
      const { error: insErr } = await db
        .from("frelux_archie_ingestions")
        .insert({
          created_by: ctx.userId,
          input_type: "SOURCE_CODE",
          title: repoPath
            ? `FRELUX repository: ${repoPath}`
            : "Owner-supplied code inspection",
          domain: "programming",
          source_ref: repoPath
            ? `github:petertubin-droid/frelux/${repoPath}`
            : "chat:owner-supplied",
          raw_text: code
            ? code.slice(0, 20_000)
            : Array.isArray(result.repository_listing)
              ? JSON.stringify(result.repository_listing).slice(0, 20_000)
              : null,
          pipeline_state: "RECEIVED",
        });

      return {
        ...result,
        persisted_to_learning: insErr ? false : true,
        persistence_error: insErr ? insErr.message : undefined,
      };
    },
  },
  // ---- REAL platform sentry duty: live boot checks of the
  // ARCHIE edge functions + deterministic database health.
  // (Sentry SaaS is not connected; ARCHIE stands its own watch) ----
  {
    name: "sentry_diagnostics",
    description:
      "Run ARCHIE's own sentry duty: live boot/health checks of all five ARCHIE edge functions (chat, agents, crypto, extract, ingestion) plus deterministic counts of the core ARCHIE database tables. Returns REAL status only - report exactly what is up or down, never guess.",
    parameters: { type: "object", properties: {}, required: [] },
    operational: true,
    execute: async () => {
      const fns = [
        "archie-chat",
        "archie-agents",
        "archie-crypto",
        "archie-extract",
        "archie-ingestion",
      ];
      const checks = await Promise.all(
        fns.map(async (fn) => {
          try {
            const res = await fetchWithTimeout(
              `${SUPABASE_URL}/functions/v1/${fn}`,
              10_000,
              "OPTIONS",
            );
            // An unauthenticated ping that answers 401/405 means the
            // function IS deployed and enforcing auth - it booted fine.
            // Only 5xx / network failure means unhealthy.
            return {
              function: fn,
              status: res.status,
              healthy: res.status < 500,
            };
          } catch (e) {
            return {
              function: fn,
              status: 0,
              healthy: false,
              error: String(e).slice(0, 120),
            };
          }
        }),
      );

      const tables = [
        "frelux_archie_conversations",
        "frelux_archie_messages",
        "frelux_archie_ingestions",
        "frelux_archie_audit_events",
        "frelux_archie_market_observations",
      ];
      const dbHealth: Record<string, unknown>[] = [];
      for (const t of tables) {
        const { count, error } = await db
          .from(t)
          .select("id", { count: "exact", head: true });
        dbHealth.push({
          table: t,
          rows: error ? null : count,
          error: error ? error.message : undefined,
        });
      }

      return {
        checked_at: new Date().toISOString(),
        edge_functions: checks,
        database_health: dbHealth,
        summary: {
          functions_healthy: checks.filter((c) => c.healthy).length,
          functions_total: checks.length,
        },
      };
    },
  },
  // ---- REAL property intelligence: location routing to the
  // regional profile (observed material/labour data) +
  // configured price catalog, with honest gap reporting.
  // No figures are invented - only recorded data and the
  // Owner's own stated building facts are returned ----
  {
    name: "property_intelligence",
    description:
      "Structured property analysis and location intelligence. Pass `location` (region/country/state) and any known building facts in `building` (e.g. {floor_area_m2: 180, stories: 2, roof_type: 'hip', use: 'residential'}). Returns the regional profile from recorded market observations, the configured material catalog, and a deterministic gap report listing exactly what data is still needed for a full FRELUX takeoff. Analyze from the returned records; never invent quantities or prices.",
    parameters: {
      type: "object",
      properties: {
        location: {
          type: "string",
          description: "Region, state or country, e.g. 'Lagos, Nigeria'",
        },
        building: {
          type: "object",
          description:
            "Known building facts supplied by the Owner, e.g. {floor_area_m2, stories, roof_type, use}",
        },
        question: { type: "string" },
      },
      required: ["location"],
    },
    operational: true,
    execute: async (input, ctx) => {
      const location = String(input.location ?? "")
        .trim()
        .slice(0, 120);
      if (!location) return { error: "location is required" };
      const building =
        input.building && typeof input.building === "object"
          ? (input.building as Record<string, unknown>)
          : {};

      // Regional profile: latest observation per kind/item (deterministic SQL)
      const obsRes = await db
        .from("frelux_archie_market_observations")
        .select(
          "kind,item,value,currency,unit,price_kind,observed_at,confidence,source_ref,region",
        )
        .ilike("region", `%${location}%`)
        .order("observed_at", { ascending: false })
        .limit(100);
      if (obsRes.error) return { error: obsRes.error.message };
      const observations = obsRes.data ?? [];

      const catRes = await db
        .from("material_prices")
        .select("name,category,unit,price,currency")
        .eq("is_active", true)
        .limit(50);
      if (catRes.error) return { error: catRes.error.message };

      // Deterministic gap report for a full takeoff
      const gaps: string[] = [];
      if (observations.length === 0)
        gaps.push(
          `No recorded market observations for ${location} yet - regional price context is unavailable`,
        );
      const needFacts = [
        ["floor_area_m2", "floor area (m²)"],
        ["stories", "number of stories"],
        ["roof_type", "roof type"],
      ];
      for (const [key, label] of needFacts)
        if (building[key] === undefined)
          gaps.push(`Building fact missing: ${label}`);
      if (!observations.some((o) => o.kind === "LABOUR_RATE"))
        gaps.push("No recorded labour rates for this region");

      const { error: insErr } = await db
        .from("frelux_archie_ingestions")
        .insert({
          created_by: ctx.userId,
          input_type: "TEXT",
          title: `Property intelligence analysis: ${location}`,
          domain: "property",
          region: location,
          source_ref: "archie:property_intelligence",
          raw_text: JSON.stringify({
            building,
            observations: observations.slice(0, 20),
          }).slice(0, 20_000),
          pipeline_state: "RECEIVED",
        });

      return {
        location,
        building_facts_as_given: building,
        regional_market_observations: observations,
        configured_material_catalog: catRes.data ?? [],
        gap_report: gaps,
        analysis_ready: gaps.length === 0,
        persisted_to_learning: insErr ? false : true,
      };
    },
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

// =========================================================
// web_intelligence — REAL website inspection
// URL → robots-aware fetch → structured extraction →
// persisted ARCHIE ingestion (owner learning path).
// No fake results: every field comes from the live response.
// =========================================================
function isBlockedHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (
    !h ||
    h === "localhost" ||
    h.endsWith(".localhost") ||
    h.endsWith(".local") ||
    h.endsWith(".internal") ||
    h.endsWith(".lan")
  ) {
    return true;
  }
  const m = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]),
      b = Number(m[2]);
    if (a === 0 || a === 10 || a === 127 || a >= 240) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true;
    if (a === 198 && (b === 18 || b === 19)) return true;
  }
  if (h.includes(":")) return true; // IPv6 literals: block (no inspection need)
  return false;
}

function starDisallowRules(robotsTxt: string): string[] {
  const rules: string[] = [];
  let inStar = false;
  let groupHasRule = false;
  for (const raw of robotsTxt.split(/\r?\n/)) {
    const line = raw.split("#")[0].trim();
    if (!line) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim().toLowerCase();
    const val = line.slice(idx + 1).trim();
    if (key === "user-agent") {
      if (groupHasRule) {
        inStar = false;
        groupHasRule = false;
      }
      if (val === "*") inStar = true;
    } else if (inStar && key === "disallow") {
      rules.push(val);
      groupHasRule = true;
    } else if (inStar && (key === "allow" || key === "crawl-delay")) {
      groupHasRule = true;
    }
  }
  return rules;
}

function robotsBlocks(rules: string[], pathname: string): string | null {
  let matched: string | null = null;
  for (const rule of rules) {
    if (!rule) continue;
    try {
      const pat = rule
        .replace(/[.+?^${}()|[\]\\]/g, "\\$&")
        .replace(/\*/g, ".*");
      if (new RegExp(`^${pat}`).test(pathname)) {
        if (matched === null || rule.length > matched.length) matched = rule;
      }
    } catch {
      /* malformed rule: skip */
    }
  }
  return matched;
}

async function fetchWithTimeout(
  url: string,
  ms: number,
  headers: Record<string, string> = {},
): Promise<Response> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, {
      headers: {
        "user-agent": "ARCHIE-Inspector/1.0 (owner-authorized site inspection)",
        ...headers,
      },
      redirect: "follow",
      signal: ctrl.signal,
    });
  } finally {
    clearTimeout(t);
  }
}

function decodeEntities(s: string): string {
  return s
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

function extractSiteReport(html: string) {
  const strip = (s: string) =>
    decodeEntities(s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ")).trim();
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const metaDesc =
    html.match(
      /<meta[^>]+name=["']description["'][^>]*content=["']([^"']*)/i,
    )?.[1] ??
    html.match(
      /<meta[^>]+content=["']([^"']*)["'][^>]*name=["']description["']/i,
    )?.[1] ??
    null;
  const h1 = [...html.matchAll(/<h1[^>]*>([\s\S]*?)<\/h1>/gi)]
    .map((m) => strip(m[1]))
    .filter(Boolean)
    .slice(0, 5);
  const h2 = [...html.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)]
    .map((m) => strip(m[1]))
    .filter(Boolean)
    .slice(0, 10);
  const bodyText = decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " "),
  ).trim();
  return {
    title: title ? decodeEntities(title).trim() : null,
    meta_description: metaDesc ? decodeEntities(metaDesc).trim() : null,
    headings: { h1: h1, h2: h2 },
    word_count: bodyText ? bodyText.split(" ").length : 0,
    counts: {
      links: (html.match(/<a\s[^>]*href=/gi) ?? []).length,
      images: (html.match(/<img\s/gi) ?? []).length,
      forms: (html.match(/<form\s/gi) ?? []).length,
      scripts: (html.match(/<script\s/gi) ?? []).length,
    },
    content_excerpt: bodyText.slice(0, 4000),
  };
}

// =========================================================
// code_intelligence — REAL code inspection
// Owner-supplied code OR FRELUX repository files via the
// GitHub API. Deterministic security findings + the code
// itself, so the reasoning layer analyzes REAL material.
// =========================================================
interface CodeFinding {
  severity: "high" | "medium" | "low" | "info";
  rule: string;
  detail: string;
}

function scanCode(code: string): CodeFinding[] {
  const findings: CodeFinding[] = [];
  const lines = code.split("\n");
  lines.forEach((line, i) => {
    const n = i + 1;
    const trimmed = line.trim();
    if (/^(\/\/|#)\s*(TODO|FIXME|HACK)\b/i.test(trimmed)) {
      findings.push({
        severity: "info",
        rule: "todo-marker",
        detail: `line ${n}: ${trimmed.slice(0, 90)}`,
      });
    }
    if (
      /\bsk-[A-Za-z0-9]{16,}\b/.test(line) ||
      /AIza[A-Za-z0-9_-]{20,}/.test(line) ||
      /AQ\.[A-Za-z0-9_-]{20,}/.test(line) ||
      /gh[pousr]_[A-Za-z0-9]{30,}/.test(line) ||
      /-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(line)
    ) {
      findings.push({
        severity: "high",
        rule: "hardcoded-secret",
        detail: `line ${n}: credential-looking literal — move to environment secrets`,
      });
    }
    if (
      /\b(password|secret|api_?key|token)\s*[:=]\s*["'][^"'"'"']{6,}["']/i.test(
        line,
      ) &&
      !/env\.|secrets|placeholder/i.test(line)
    ) {
      findings.push({
        severity: "medium",
        rule: "credential-assignment",
        detail: `line ${n}: assigns a literal to a credential-named variable`,
      });
    }
    if (/\beval\s*\(/.test(line)) {
      findings.push({
        severity: "high",
        rule: "eval-usage",
        detail: `line ${n}: eval() — verify necessity and input trust`,
      });
    }
    if (/dangerouslySetInnerHTML|\.innerHTML\s*=/.test(line)) {
      findings.push({
        severity: "medium",
        rule: "raw-html-injection",
        detail: `line ${n}: raw HTML injection — confirm the input is sanitized`,
      });
    }
    if (/\bconsole\.log\(/.test(line)) {
      findings.push({
        severity: "low",
        rule: "console-log",
        detail: `line ${n}: console.log left in code`,
      });
    }
  });
  return findings.slice(0, 40);
}

async function fetchRepoFile(repoPath: string): Promise<
  | {
      ok: true;
      listing?: unknown[];
      file?: { path: string; size: number; content: string };
      truncated?: boolean;
    }
  | { ok: false; error: string }
> {
  const token = Deno.env.get("GITHUB_ACCESS_TOKEN");
  if (!token) {
    return {
      ok: false,
      error:
        "GitHub inspection is not configured: GITHUB_ACCESS_TOKEN is missing on the ARCHIE function. The Owner can add it in Supabase project secrets.",
    };
  }
  const api = `https://api.github.com/repos/petertubin-droid/frelux/contents/${repoPath}?ref=main`;
  const res = await fetchWithTimeout(api, 15000, {
    authorization: `Bearer ${token}`,
    accept: "application/vnd.github+json",
  });
  if (res.status === 404)
    return {
      ok: false,
      error: `Path "${repoPath}" was not found in the FRELUX repository (main branch).`,
    };
  if (!res.ok)
    return { ok: false, error: `GitHub API returned HTTP ${res.status}.` };
  const body = await res.json();
  if (Array.isArray(body)) {
    return {
      ok: true,
      listing: body
        .map((e: { path: string; type: string; size?: number }) => ({
          path: e.path,
          type: e.type,
          size: e.size ?? null,
        }))
        .slice(0, 100),
    };
  }
  const content = body?.content ?? "";
  let decoded = "";
  try {
    decoded = atob(content.replace(/\n/g, ""));
  } catch {
    return { ok: false, error: "File content could not be decoded." };
  }
  const truncated = decoded.length > 60000;
  return {
    ok: true,
    file: {
      path: body.path,
      size: decoded.length,
      content: decoded.slice(0, 60000),
    },
    truncated,
  };
}

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
  const history = (body.history ?? []).slice(-20).map((t) => ({
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

      const output = await tool.execute(call.args ?? {}, { userId: user.id });
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

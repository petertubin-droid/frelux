// =========================================================
// Ported: health
//
// Answers the same question the Supabase function answers - "is the platform
// serving?" - from the edge. It reports what it can actually see from here and
// says "unknown" where it cannot check, rather than copying the origin's
// verdict.
// =========================================================

import { hasBindings, json, type EdgeEnv, type EdgeHandler } from "./runtime";

export const requiredBindings = ["SUPABASE_URL"] as const;

interface HealthBody {
  status: "healthy" | "degraded";
  runtime: "cloudflare-workers";
  timestamp: string;
  checks: {
    database: "up" | "down" | "unknown";
    ai_providers: "not-ported";
    payment: "unknown";
  };
  notes: string[];
}

export const healthHandler: EdgeHandler = async (_request, env, _ctx, cors) => {
  const notes: string[] = [];
  let database: HealthBody["checks"]["database"] = "unknown";

  if (!hasBindings(env, ["SUPABASE_URL"])) {
    notes.push("SUPABASE_URL binding is missing, so the database was not probed.");
  } else {
    // PostgREST answers /rest/v1/ with 200 even without a key; a failure here
    // means the project is unreachable, not that a table is empty.
    try {
      const res = await fetch(`${String(env.SUPABASE_URL).replace(/\/+$/, "")}/rest/v1/`, {
        method: "GET",
        headers: { accept: "application/json" },
      });
      database = res.status < 500 ? "up" : "down";
      if (database === "down") notes.push(`Database probe returned ${res.status}.`);
    } catch {
      database = "down";
      notes.push("Database probe could not be reached from the edge.");
    }
  }

  notes.push(
    "AI providers are not hosted on the Worker: those functions stay on Supabase.",
  );

  const body: HealthBody = {
    status: database === "down" ? "degraded" : "healthy",
    runtime: "cloudflare-workers",
    timestamp: new Date().toISOString(),
    checks: {
      database,
      ai_providers: "not-ported",
      payment: "unknown",
    },
    notes,
  };

  return json(body, body.status === "healthy" ? 200 : 503, cors);
};

export const healthConfig = {
  name: "health",
  methods: ["GET"],
  requiredBindings: [...requiredBindings],
  handler: healthHandler,
};

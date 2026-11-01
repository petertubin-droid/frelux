// FRELUX agent execution recovery
//
// Resolves project_agent_actions rows left in `executed` by a process that died
// before recording a result. The rule lives in the database function
// recover_interrupted_agent_executions(); this endpoint exists so a scheduler
// can run it and so an operator can run it by hand.
//
// Refuses anything that is not carrying the scheduler token: this writes across
// every user's actions.

import { createClient } from "npm:@supabase/supabase-js@2.45.4";
import { serveWithCors } from "../_shared/serve.ts";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

serveWithCors(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200 });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const expected = Deno.env.get("SCHEDULER_TOKEN") ?? "";
  const provided = req.headers.get("x-scheduler-token") ?? "";
  if (!expected || provided !== expected) {
    return json({ error: "Not authorized" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  if (!supabaseUrl || !serviceRoleKey) {
    return json({ error: "Not configured" }, 500);
  }

  let quietMinutes = 30;
  try {
    const body = (await req.json()) as { quiet_minutes?: number };
    if (typeof body?.quiet_minutes === "number")
      quietMinutes = body.quiet_minutes;
  } catch {
    // no body is fine, the database default applies
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { data, error } = await admin.rpc(
    "recover_interrupted_agent_executions",
    {
      p_quiet_minutes: quietMinutes,
    },
  );

  if (error) {
    return json({ error: error.message, recovered: 0 }, 500);
  }

  const recovered = (data ?? []) as Array<{
    recovered_id: string;
    started_at: string;
  }>;
  return json({ recovered: recovered.length, actions: recovered });
});

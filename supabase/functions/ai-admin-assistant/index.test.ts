import { describe, it, expect, afterEach } from "vitest";
import "./index.ts";
import {
  getHandler,
  givenUser,
  givenRows,
  req,
  json,
  state,
} from "../_shared/testing/harness.ts";

const handler = getHandler();

let reqNo = 0;
/** Unique rate-limit key per request (functions rate-limit per user). */
function rreq(
  method: string,
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  reqNo += 1;
  return handler(
    req(method, "", body, {
      "x-user-id": `t-${reqNo}`,
      ...headers,
    }),
  );
}

/** Stub global fetch for external (non-Supabase) API calls. */
function stubFetch(
  fn: (url: string, init?: any) => Response | Promise<Response>,
): () => void {
  const orig = (globalThis as any).fetch;
  (globalThis as any).fetch = async (input: any, init?: any) => {
    const url =
      typeof input === "string" ? input : (input?.url ?? String(input));
    return fn(url, init);
  };
  return () => {
    (globalThis as any).fetch = orig;
  };
}

let restores: Array<() => void> = [];
afterEach(() => {
  restores.forEach((r) => r());
  restores = [];
});

const ADMIN_ID = "55555555-5555-4555-8555-555555555555";
const auth = { Authorization: "Bearer tok" };

function givenAdmin() {
  givenUser({ id: ADMIN_ID, email: "admin@test.local" });
  givenRows("profiles", [{ id: ADMIN_ID, role: "admin" }]);
}

describe("ai-admin-assistant — Solas admin copilot", () => {
  it("requires authentication", async () => {
    const res = await rreq("POST", { message: "hello" });
    expect(res.status).toBe(401);
  });

  it("requires an admin profile", async () => {
    givenUser({ id: ADMIN_ID });
    givenRows("profiles", [{ id: ADMIN_ID, role: "user" }]);
    const res = await rreq("POST", { message: "hello" }, auth);
    expect(res.status).toBe(403);
  });

  it("requires a message", async () => {
    givenAdmin();
    const res = await rreq("POST", { message: "   " }, auth);
    expect(res.status).toBe(400);
  });

  it("reports honestly when no Solas API key is configured", async () => {
    givenAdmin();
    const res = await rreq("POST", { message: "summarize today" }, auth);
    expect(res.status).toBe(400);
    const body = await json(res);
    expect(body.needsConfig).toBe(true);
  });

  it("creates a conversation and relays the assistant reply", async () => {
    givenAdmin();
    state.env.SOLAS_API_KEY = "sk-test";
    let calls = 0;
    restores.push(
      stubFetch((url, init) => {
        calls += 1;
        if (url.endsWith("/conversations")) {
          return new Response(JSON.stringify({ id: "conv-9" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        expect(url).toContain("/conversations/conv-9/messages");
        expect(JSON.parse(init?.body).message).toBe("summarize today");
        return new Response(
          JSON.stringify({ response: "All systems nominal", id: "m-7" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );
    const res = await rreq("POST", { message: "summarize today" }, auth);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.response).toBe("All systems nominal");
    expect(body.conversationId).toBe("conv-9");
    expect(calls).toBe(2);
  });

  it("records an action item when actionTitle is provided", async () => {
    givenAdmin();
    state.env.SOLAS_API_KEY = "sk-test";
    restores.push(
      stubFetch((url) => {
        if (url.endsWith("/conversations")) {
          return new Response(JSON.stringify({ id: "conv-10" }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        }
        return new Response(JSON.stringify({ response: "logged", id: "m-8" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }),
    );
    const res = await rreq(
      "POST",
      { message: "fix the bug", actionTitle: "Bugfix", actionCategory: "bug" },
      auth,
    );
    expect(res.status).toBe(200);
    const actions = (
      await import("../_shared/testing/harness.ts")
    ).tableFixtures.get("admin_ai_actions");
    expect(actions?.length ?? 0).toBe(1);
    expect(actions[0].title).toBe("Bugfix");
  });

  it("maps a Solas outage to 502", async () => {
    givenAdmin();
    state.env.SOLAS_API_KEY = "sk-test";
    restores.push(
      stubFetch(() => new Response("unauthorized", { status: 401 })),
    );
    const res = await rreq("POST", { message: "summarize today" }, auth);
    expect(res.status).toBe(502);
  });
});

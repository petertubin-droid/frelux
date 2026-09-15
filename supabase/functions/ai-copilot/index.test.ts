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

const USER_ID = "22222222-2222-4222-8222-222222222222";
const auth = { Authorization: "Bearer tok" };

function geminiResponse(payload: unknown, ok = true): Response {
  return new Response(
    JSON.stringify({
      candidates: ok
        ? [{ content: { parts: [{ text: JSON.stringify(payload) }] } }]
        : [],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

describe("ai-copilot — Gemini interpreter (admin-side facts only)", () => {
  it("reports unconfigured AI honestly with 503", async () => {
    const res = await rreq(
      "POST",
      { text: "build a 3 bedroom bungalow" },
      auth,
    );
    expect(res.status).toBe(503);
    expect((await json(res)).error).toContain("not configured");
  });

  it("requires authentication", async () => {
    state.env.GOOGLE_AI_API_KEY = "g-key";
    const res = await rreq("POST", { text: "hello" });
    expect(res.status).toBe(401);
  });

  it("validates the request text", async () => {
    state.env.GOOGLE_AI_API_KEY = "g-key";
    givenUser({ id: USER_ID });
    const empty = await rreq("POST", { text: "" }, auth);
    expect(empty.status).toBe(400);
    const tooLong = await rreq("POST", { text: "x".repeat(2001) }, auth);
    expect(tooLong.status).toBe(400);
  });

  it("returns the interpretation for a valid Gemini reply", async () => {
    state.env.GOOGLE_AI_API_KEY = "g-key";
    givenUser({ id: USER_ID });
    restores.push(
      stubFetch((url) => {
        expect(url).toContain("generativelanguage.googleapis.com");
        return geminiResponse({
          interpretation: { taskType: "unsupported", evidence: [] },
        });
      }),
    );
    const res = await rreq("POST", { text: "paint my room" }, auth);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.interpretation.taskType).toBe("unsupported");
  });

  it("maps a Gemini outage to 502", async () => {
    state.env.GOOGLE_AI_API_KEY = "g-key";
    givenUser({ id: USER_ID });
    restores.push(stubFetch(() => new Response("quota", { status: 429 })));
    const res = await rreq("POST", { text: "paint my room" }, auth);
    expect(res.status).toBe(502);
  });

  it("rejects malformed or interpretation-less model output", async () => {
    state.env.GOOGLE_AI_API_KEY = "g-key";
    givenUser({ id: USER_ID });
    restores.push(stubFetch(() => geminiResponse("not json")));
    const bad = await rreq("POST", { text: "hello" }, auth);
    expect(bad.status).toBe(502);
    restores.push(stubFetch(() => geminiResponse({ unrelated: true })));
    const noInterp = await rreq("POST", { text: "hello" }, auth);
    expect(noInterp.status).toBe(502);
    expect((await json(noInterp)).error).toContain("Malformed interpretation");
  });
});

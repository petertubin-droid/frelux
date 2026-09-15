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

const USER_ID = "11111111-1111-4111-8111-111111111111";

function givenAdmin() {
  givenUser({ id: USER_ID, email: "admin@test.local" });
  givenRows("profiles", [{ id: USER_ID, role: "admin" }]);
}

const auth = { Authorization: "Bearer tok" };

describe("intel-search — admin web search (Tavily)", () => {
  it("rejects non-POST with 405", async () => {
    const res = await rreq("GET", undefined, auth);
    expect(res.status).toBe(405);
  });

  it("requires authentication", async () => {
    const res = await rreq("POST", { query: "test" });
    expect(res.status).toBe(401);
  });

  it("requires an admin profile", async () => {
    givenUser({ id: USER_ID, email: "user@test.local" });
    givenRows("profiles", [{ id: USER_ID, role: "user" }]);
    const res = await rreq("POST", { query: "test" }, auth);
    expect(res.status).toBe(403);
  });

  it("requires a query", async () => {
    givenAdmin();
    const res = await rreq("POST", {}, auth);
    expect(res.status).toBe(400);
  });

  it("reports no provider configured with 409", async () => {
    givenAdmin();
    const res = await rreq("POST", { query: "roofing" }, auth);
    expect(res.status).toBe(409);
  });

  it("rejects a registered provider without its server-side key", async () => {
    givenAdmin();
    givenRows("frelux_search_providers", [
      { name: "Tavily", adapter: "TAVILY", enabled: true },
    ]);
    const res = await rreq("POST", { query: "roofing" }, auth);
    expect(res.status).toBe(409);
    expect((await json(res)).error).toContain("API key");
  });

  it("returns evidence candidates for a valid admin search", async () => {
    givenAdmin();
    givenRows("frelux_search_providers", [
      { name: "Tavily", adapter: "TAVILY", enabled: true },
    ]);
    state.env.TAVILY_API_KEY = "tv-key";
    restores.push(
      stubFetch((url) => {
        expect(url).toBe("https://api.tavily.com/search");
        return new Response(
          JSON.stringify({
            results: [
              {
                title: "Roof guide",
                url: "https://x.test/guide",
                content: "A useful guide.",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );
    const res = await rreq("POST", { query: "roofing" }, auth);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.ok).toBe(true);
    expect(body.provider).toBe("TAVILY");
    expect(body.results[0].url).toBe("https://x.test/guide");
    expect(body.results[0].provider).toBe("TAVILY");
    expect(body.message).toContain("EVIDENCE CANDIDATES");
  });

  it("maps a provider failure to 502", async () => {
    givenAdmin();
    givenRows("frelux_search_providers", [
      { name: "Tavily", adapter: "TAVILY", enabled: true },
    ]);
    state.env.TAVILY_API_KEY = "tv-key";
    restores.push(
      stubFetch(() => new Response("upstream error", { status: 500 })),
    );
    const res = await rreq("POST", { query: "roofing" }, auth);
    expect(res.status).toBe(502);
  });
});

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

const USER_ID = "33333333-3333-4333-8333-333333333333";
const auth = { Authorization: "Bearer tok" };
const previewBody = {
  targetColors: [
    { name: "Fern", hex: "#4a7c59" },
    { name: "Sand", hex: "#c9a66b" },
  ],
  roomType: "living room",
  lightingCondition: "north light",
};

describe("ai-color-preview — Gemini room color preview", () => {
  it("rejects non-POST with 405", async () => {
    givenUser({ id: USER_ID });
    const res = await rreq("GET", undefined, auth);
    expect(res.status).toBe(405);
  });

  it("returns 500 when the body is missing", async () => {
    givenUser({ id: USER_ID });
    const res = await rreq("POST", undefined, auth);
    expect(res.status).toBe(500);
    expect((await json(res)).code).toBe("INTERNAL_ERROR");
  });

  it("respects the AI feature switch (AI_DISABLED)", async () => {
    givenUser({ id: USER_ID });
    givenRows("site_settings", [{ key: "ai_enabled", value: "false" }]);
    const res = await rreq("POST", previewBody, auth);
    expect(res.status).toBe(403);
    expect((await json(res)).code).toBe("AI_DISABLED");
  });

  it("reports a missing Gemini key with NO_API_KEY", async () => {
    givenUser({ id: USER_ID });
    givenRows("site_settings", [{ key: "ai_enabled", value: "true" }]);
    const res = await rreq("POST", previewBody, auth);
    expect(res.status).toBe(503);
    expect((await json(res)).code).toBe("NO_API_KEY");
  });

  it("returns the preview for a valid Gemini reply", async () => {
    givenUser({ id: USER_ID });
    givenRows("site_settings", [
      { key: "ai_enabled", value: "true" },
      { key: "gemini_api_key", value: "g-key" },
    ]);
    restores.push(
      stubFetch((url) => {
        expect(url).toContain("generativelanguage.googleapis.com");
        return new Response(
          JSON.stringify({
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: JSON.stringify({
                        previewDescription: "A calm, leaf-toned living room.",
                        colorSuggestions: [
                          {
                            hex: "#4a7c59",
                            name: "Fern",
                            reasoning: "Softens north light",
                            coverageArea: "walls",
                          },
                        ],
                        applicationTips: ["Two coats over primer"],
                      }),
                    },
                  ],
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }),
    );
    const res = await rreq("POST", previewBody, auth);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.result.previewDescription).toContain("living room");
    expect(body.result.colorSuggestions[0].hex).toBe("#4a7c59");
  });

  it("degrades gracefully when the model returns prose not JSON", async () => {
    givenUser({ id: USER_ID });
    givenRows("site_settings", [
      { key: "ai_enabled", value: "true" },
      { key: "gemini_api_key", value: "g-key" },
    ]);
    restores.push(
      stubFetch(
        () =>
          new Response(
            JSON.stringify({
              candidates: [
                { content: { parts: [{ text: "A rich terracotta mood." }] } },
              ],
            }),
            { status: 200, headers: { "Content-Type": "application/json" } },
          ),
      ),
    );
    const res = await rreq("POST", previewBody, auth);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.result.previewDescription).toContain("terracotta");
    expect(body.result.colorSuggestions).toEqual([]);
  });
});

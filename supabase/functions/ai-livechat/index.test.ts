import { describe, it, expect } from "vitest";
import "./index.ts";
import { getHandler, req, json } from "../_shared/testing/harness.ts";

const handler = getHandler();

let reqNo = 0;
function rreq(method: string, body: unknown): Promise<Response> {
  reqNo += 1;
  return handler(req(method, "", body, { "x-user-id": `lc-${reqNo}` }));
}

describe("ai-livechat — public ARCHIE guidance (no tools)", () => {
  it("rejects a non-JSON body", async () => {
    const res = await rreq("POST", undefined);
    expect(res.status).toBe(400);
    expect((await json(res)).error).toContain("Invalid JSON");
  });

  it("requires a question", async () => {
    const res = await rreq("POST", { question: "  " });
    expect(res.status).toBe(400);
    expect((await json(res)).error).toContain("Question is required");
  });

  it("answers through ARCHIE's native engine (no external provider)", async () => {
    const res = await rreq("POST", { question: "What is FRELUX?" });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.engine).toBe("archie-native");
    expect(body.result.length).toBeGreaterThan(0);
    const log = (
      await import("../_shared/testing/harness.ts")
    ).tableFixtures.get("ai_request_log");
    const last = log?.[log.length - 1];
    expect(last).toBeTruthy();
  }, 60000);

  it("enforces a rate limit per caller", async () => {
    // Hammer one caller id past the AI window and expect a 429.
    let sawLimit = false;
    for (let i = 0; i < 25; i++) {
      const res = await handler(
        req("POST", "", { question: "hi" }, { "x-user-id": "lc-flood" }),
      );
      if (res.status === 429) {
        sawLimit = true;
        break;
      }
    }
    expect(sawLimit).toBe(true);
  });
});

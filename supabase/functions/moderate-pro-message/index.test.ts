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

const USER_ID = "44444444-4444-4444-8444-444444444444";
const auth = { Authorization: "Bearer tok" };

describe("moderate-pro-message — Pro-Connect moderation", () => {
  it("requires authentication", async () => {
    const res = await rreq("POST", {
      messageId: "m1",
      content: "hello",
      conversationId: "c1",
      userId: USER_ID,
    });
    expect(res.status).toBe(401);
  });

  it("requires messageId and content", async () => {
    givenUser({ id: USER_ID });
    const res = await rreq("POST", { content: "hello" }, auth);
    expect(res.status).toBe(400);
  });

  it("rejects a non-JSON body", async () => {
    givenUser({ id: USER_ID });
    const res = await rreq("POST", undefined, auth);
    expect(res.status).toBe(400);
  });

  it("auto-removes obvious banned content on the fast path", async () => {
    givenUser({ id: USER_ID });
    const res = await rreq(
      "POST",
      {
        messageId: "m1",
        content: "join my bitcoin investment scheme now",
        conversationId: "c1",
        userId: USER_ID,
      },
      auth,
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.action).toBe("remove");
    expect(body.score).toBe(1.0);
    expect(body.categories.length).toBeGreaterThan(0);
  });

  it("allows clean content via the ARCHIE authority", async () => {
    givenUser({ id: USER_ID });
    const res = await rreq(
      "POST",
      {
        messageId: "m2",
        content: "Hello, I can supply roof sheets in Lagos",
        conversationId: "c1",
        userId: USER_ID,
      },
      auth,
    );
    expect(res.status).toBe(200);
    expect((await json(res)).action).toBe("allow");
  });
});

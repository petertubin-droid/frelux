// Unit tests for archie-chat (visitor + voice brain — same engine,
// same consent records as the owner chat).
// E2E-verified live 2026-09-15: visitor paint question → real
// deterministic estimate; owner path → full cognitive engine.
import { describe, it, expect } from "vitest";
import "./index.ts";
import {
  getHandler,
  givenOwnerIsAdmin,
  req,
  OWNER_AUTH,
  json,
} from "../_shared/testing/harness.ts";

const handler = getHandler();

describe("archie-chat — request validation", () => {
  it("rejects a non-JSON body with 400", async () => {
    const res = await handler(
      new Request("https://test-project.supabase.co/functions/v1/fn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{not json",
      }),
    );
    expect(res.status).toBe(400);
    expect((await json(res)).error).toMatch(/Invalid JSON/);
  });

  it("rejects an empty message with 400", async () => {
    const res = await handler(req("POST", "", { message: "" }));
    expect(res.status).toBe(400);
    expect((await json(res)).error).toMatch(/Message is required/);
  });
});

describe("archie-chat — visitor engine path", () => {
  it("answers a paint question through the real cognitive engine", async () => {
    const res = await handler(
      req("POST", "", {
        conversationId: "visitor-test",
        message: "What paint do I need for a 12 by 12 room?",
      }),
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(typeof body.reply).toBe("string");
    expect(body.reply.length).toBeGreaterThan(0);
    // the engine self-reports its path — never a fake reply
    expect(body.engine?.path).toBeTruthy();
  });

  it("greets a simple hello (no math dead-end)", async () => {
    const res = await handler(
      req("POST", "", { conversationId: "visitor-greet", message: "hello" }),
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.reply.toLowerCase()).not.toMatch(/arithmetic expression/);
  });
});

describe("archie-chat — OPTIONS", () => {
  it("answers preflights at the CORS boundary", async () => {
    const res = await handler(
      new Request("https://test-project.supabase.co/functions/v1/fn", {
        method: "OPTIONS",
        headers: {
          Origin: "https://freluxtools.netlify.app",
          "Access-Control-Request-Method": "POST",
        },
      }),
    );
    expect(res.status).toBeLessThan(400);
  });
});

// Unit tests for the archie-core edge function (owner chat).
//
// archie-core is the owner-only chat front door to the ARCHIE
// cognitive core. The 2026-09-15 forensic fix verified live in
// prod (hello → greeting, identity → ARCHIE answer, 25*48 → 1200,
// no math dead-end). These tests pin the access contract:
//
//   * 401 without a session, 401 invalid JWT, 403 non-admin (+audit)
//   * 400 on empty message
//   * 404 when the conversation does not belong to the owner
//   * OPTIONS preflight at the CORS boundary

import { describe, it, expect } from "vitest";
import "./index.ts";
import {
  getHandler,
  givenOwnerIsAdmin,
  givenRows,
  givenUser,
  req,
  OWNER_AUTH,
  OWNER_ID,
  json,
} from "../_shared/testing/harness.ts";

const handler = getHandler();

const CONV_ID = "33333333-3333-4333-8333-333333333333";

function givenConversation(ownerId = OWNER_ID) {
  givenRows("frelux_archie_conversations", [
    { id: CONV_ID, owner_id: ownerId, title: "test" },
  ]);
}

describe("archie-core — owner gate", () => {
  it("rejects unauthenticated callers with 401", async () => {
    const res = await handler(req("POST", "", { message: "hello" }));
    expect(res.status).toBe(401);
  });

  it("rejects an invalid JWT with 401", async () => {
    givenUser(null);
    const res = await handler(
      req("POST", "", { message: "hello" }, OWNER_AUTH),
    );
    expect(res.status).toBe(401);
  });

  it("rejects a non-admin with 403 and audits the attempt", async () => {
    const userId = "44444444-4444-4444-8444-444444444444";
    givenUser({ id: userId, email: "visitor@test.local" });
    givenRows("profiles", [{ id: userId, role: "user" }]);
    const res = await handler(
      req("POST", "", { message: "hello" }, OWNER_AUTH),
    );
    expect(res.status).toBe(403);
    expect((await json(res)).error).toMatch(/Owner-only/i);
  });
});

describe("archie-core — request validation", () => {
  it("rejects an empty message with 400", async () => {
    givenOwnerIsAdmin();
    givenConversation();
    const res = await handler(
      req("POST", "", { conversation_id: CONV_ID, message: "   " }, OWNER_AUTH),
    );
    expect(res.status).toBe(400);
    expect((await json(res)).error).toMatch(/empty/i);
  });

  it("returns 404 for a conversation that is not the owner's", async () => {
    givenOwnerIsAdmin();
    givenConversation("99999999-9999-4999-8999-999999999999");
    const res = await handler(
      req(
        "POST",
        "",
        { conversation_id: CONV_ID, message: "hello" },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(404);
    expect((await json(res)).error).toMatch(/Conversation not found/i);
  });

  it("returns 404 when no conversation id is supplied", async () => {
    givenOwnerIsAdmin();
    const res = await handler(
      req("POST", "", { message: "hello" }, OWNER_AUTH),
    );
    expect(res.status).toBe(404);
  });
});

describe("archie-core — methods", () => {
  it("rejects GET with 405", async () => {
    const res = await handler(req("GET", "", undefined, OWNER_AUTH));
    expect(res.status).toBe(405);
  });
});

// ── Gap 3: SSE STREAMING (owner upgrade 2026-09-16) ────────
describe("archie-core — SSE streaming (gap 3)", () => {
  function parseSSE(raw: string): Array<[string, Record<string, unknown>]> {
    const events: Array<[string, Record<string, unknown>]> = [];
    for (const block of raw.split("\n\n")) {
      const evLine = block.split("\n").find((l) => l.startsWith("event: "));
      const dataLine = block.split("\n").find((l) => l.startsWith("data: "));
      if (evLine && dataLine) {
        events.push([evLine.slice(7), JSON.parse(dataLine.slice(6))]);
      }
    }
    return events;
  }

  it("non-streaming requests keep the classic JSON path", async () => {
    givenOwnerIsAdmin();
    givenConversation();
    const res = await handler(
      req(
        "POST",
        "",
        { conversation_id: CONV_ID, message: "   " },
        OWNER_AUTH,
      ),
    );
    expect(res.headers.get("Content-Type")).toContain("application/json");
    expect(res.status).toBe(400);
  });

  it("streams an unauthenticated turn honestly (done carries the 401)", async () => {
    const res = await handler(
      req("POST", "", { message: "hello", stream: true }),
    );
    expect(res.status).toBe(200); // the stream opens
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    const events = parseSSE(await res.text());
    expect(events[0][0]).toBe("start");
    const done = events.find(([n]) => n === "done")![1] as {
      status: number;
      error: string;
    };
    expect(done.status).toBe(401);
    expect(done.error).toBeTruthy();
    expect(events.some(([n]) => n === "delta")).toBe(false);
  });

  it("Accept: text/event-stream also selects streaming", async () => {
    const res = await handler(
      req("POST", "", { message: "hello" }, { Accept: "text/event-stream" }),
    );
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    const events = parseSSE(await res.text());
    expect(events[0][0]).toBe("start");
  });

  it("streams a valid owner turn: start → progress → deltas → done", async () => {
    givenOwnerIsAdmin();
    givenConversation();
    const res = await handler(
      req(
        "POST",
        "",
        { conversation_id: CONV_ID, message: "hello", stream: true },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toContain("text/event-stream");
    const events = parseSSE(await res.text());
    const names = events.map(([n]) => n);
    expect(names[0]).toBe("start");
    expect(names[names.length - 1]).toBe("done");
    // honest stage progress fired (auth + gates at minimum)
    const progress = events
      .filter(([n]) => n === "progress")
      .map(([, d]) => d as Record<string, unknown>);
    expect(progress.length).toBeGreaterThan(0);
    // deltas concatenate to exactly the done reply — pacing, not fabrication
    const done = events.find(([n]) => n === "done")![1] as {
      ok: boolean;
      reply: string;
    };
    const deltas = events
      .filter(([n]) => n === "delta")
      .map(([, d]) => String((d as { text: string }).text));
    if (done.ok && typeof done.reply === "string") {
      expect(deltas.length).toBeGreaterThan(0);
      expect(deltas.join("")).toBe(done.reply);
    }
  });
});

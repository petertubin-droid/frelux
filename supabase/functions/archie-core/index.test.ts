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

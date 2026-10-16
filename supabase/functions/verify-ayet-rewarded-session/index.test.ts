import "./index.ts";
import {
  getHandler,
  givenRows,
  givenUser,
  json,
  resetCapture,
} from "../_shared/testing/harness.ts";
import { beforeEach, describe, expect, it } from "vitest";

const handler = getHandler();
const OWNER = "11111111-1111-4111-8111-111111111111";
const SESSION_ID = "22222222-2222-4222-8222-222222222222";

function post(sessionId = SESSION_ID) {
  return new Request(
    "https://test-project.supabase.co/functions/v1/verify-ayet-rewarded-session",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer owner-jwt",
      },
      body: JSON.stringify({ sessionId }),
    },
  );
}

beforeEach(() => {
  resetCapture();
  givenUser({ id: OWNER, email: "owner@example.com" });
});

describe("verify ayeT rewarded session", () => {
  it("returns only the authenticated owner's verified completed grant", async () => {
    givenRows("ayet_rewarded_sessions", [
      {
        id: SESSION_ID,
        user_id: OWNER,
        status: "completed",
        credits_awarded: 5,
        balance_after: 15,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    ]);
    const response = await handler(post());
    expect(response.status).toBe(200);
    expect(await json(response)).toEqual({
      success: true,
      status: "completed",
      creditsEarned: 5,
      newBalance: 15,
    });
  });

  it("does not reveal another user's session", async () => {
    givenRows("ayet_rewarded_sessions", [
      {
        id: SESSION_ID,
        user_id: "33333333-3333-4333-8333-333333333333",
        status: "completed",
        credits_awarded: 5,
        balance_after: 15,
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    ]);
    const response = await handler(post());
    expect(response.status).toBe(404);
  });

  it("returns pending until the provider callback marks the session complete", async () => {
    givenRows("ayet_rewarded_sessions", [
      {
        id: SESSION_ID,
        user_id: OWNER,
        status: "pending",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
      },
    ]);
    const response = await handler(post());
    expect(response.status).toBe(202);
    expect(await json(response)).toEqual({ success: false, status: "pending" });
  });
});

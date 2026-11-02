import "./index.ts";
import {
  getHandler,
  givenRows,
  givenUser,
  json,
  resetCapture,
  tableFixtures,
} from "../_shared/testing/harness.ts";
import { beforeEach, describe, expect, it } from "vitest";

const handler = getHandler();
const OWNER = "11111111-1111-4111-8111-111111111111";

function post(token?: string) {
  return new Request(
    "https://test-project.supabase.co/functions/v1/create-ayet-rewarded-session",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: "{}",
    },
  );
}

beforeEach(() => {
  resetCapture();
  givenUser({ id: OWNER, email: "owner@example.com" });
  givenRows("ad_providers", [
    {
      slug: "ayet_studios",
      is_active: true,
      credentials: { api_key: "publisher-key", placement_id: "123" },
      settings: {
        rewarded_video_enabled: true,
        rewarded_adslot_name: "Frelux credits",
        rewarded_adslot_id: "16",
      },
    },
  ]);
  givenRows("rewarded_ad_credit_config", [{ id: 1, is_enabled: true }]);
});

describe("create ayeT rewarded session", () => {
  it("requires an authenticated user", async () => {
    givenUser(null);
    const response = await handler(post());
    expect(response.status).toBe(401);
    expect(tableFixtures.get("ayet_rewarded_sessions") ?? []).toHaveLength(0);
  });

  it("creates a short-lived server-side session without returning the publisher key", async () => {
    const response = await handler(post("owner-jwt"));
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.sessionId).toMatch(/^[0-9a-f-]{36}$/i);
    expect(body.externalIdentifier).toMatch(/^[0-9a-f]{32}$/i);
    expect(body.placementId).toBe("123");
    expect(body.adslotName).toBe("Frelux credits");
    expect(JSON.stringify(body)).not.toContain("publisher-key");
    expect(tableFixtures.get("ayet_rewarded_sessions")).toEqual([
      expect.objectContaining({
        user_id: OWNER,
        external_identifier: expect.any(String),
      }),
    ]);
  });

  it("fails closed if rewards are disabled", async () => {
    givenRows("rewarded_ad_credit_config", [{ id: 1, is_enabled: false }]);
    const response = await handler(post("owner-jwt"));
    expect(response.status).toBe(409);
    expect(tableFixtures.get("ayet_rewarded_sessions") ?? []).toHaveLength(0);
  });
});

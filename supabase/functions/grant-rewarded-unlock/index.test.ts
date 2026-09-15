import { describe, it, expect } from "vitest";
import "./index.ts";
import {
  getHandler,
  givenUser,
  givenRows,
  givenRpc,
  req,
  OWNER_AUTH,
  json,
} from "../_shared/testing/harness.ts";

const handler = getHandler();
const USER_ID = "11111111-1111-4111-8111-111111111111";

function givenUser42() {
  givenUser({ id: USER_ID, email: "user@test.local" });
}

function givenTool(overrides: Record<string, any> = {}) {
  givenRows("rewarded_tool_config", [
    {
      tool_key: "finish_estimator",
      is_enabled: true,
      daily_usage_limit: 0,
      cooldown_minutes: 0,
      unlock_duration_minutes: 120,
      ...overrides,
    },
  ]);
}

describe("grant-rewarded-unlock — ad-gated tool unlocks", () => {
  it("rejects a missing toolKey/clientHash with 400", async () => {
    const res = await handler(req("POST", "", { toolKey: "finish_estimator" }));
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown tool", async () => {
    const res = await handler(
      req("POST", "", { toolKey: "nope", clientHash: "hash-1" }),
    );
    expect(res.status).toBe(404);
  });

  it("returns 403 when the tool is disabled", async () => {
    givenTool({ is_enabled: false });
    const res = await handler(
      req("POST", "", { toolKey: "finish_estimator", clientHash: "hash-1" }),
    );
    expect(res.status).toBe(403);
    expect((await json(res)).code).toBe("DISABLED");
  });

  it("requires an ad token outside dev mode", async () => {
    givenTool();
    const res = await handler(
      req("POST", "", { toolKey: "finish_estimator", clientHash: "hash-1" }),
    );
    expect(res.status).toBe(403);
    expect((await json(res)).code).toBe("AD_NOT_VERIFIED");
  });

  it("rejects an attestation for an inactive provider with 403", async () => {
    givenTool();
    givenRows("ad_providers", [
      { id: "p1", slug: "monetag", is_active: false },
    ]);
    const res = await handler(
      req("POST", "", {
        toolKey: "finish_estimator",
        clientHash: "hash-1",
        adToken: "att_monetag_unlock_1699999999",
      }),
    );
    expect(res.status).toBe(403);
    expect((await json(res)).code).toBe("PROVIDER_INACTIVE");
  });

  it("accepts a legacy Monetag attestation and grants the unlock", async () => {
    givenTool();
    const res = await handler(
      req("POST", "", {
        toolKey: "finish_estimator",
        clientHash: "hash-1",
        adProvider: "monetag",
        adToken: "monetag_unlock_1699999999",
      }),
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.success).toBe(true);
    expect(body.alreadyUnlocked).toBe(false);
    expect(body.expiresAt).toBeTruthy();
  });

  it("enforces the daily unlock limit with 429", async () => {
    givenTool({ daily_usage_limit: 1 });
    const today = new Date().toISOString().split("T")[0];
    givenRows("rewarded_unlock_log", [
      {
        tool_key: "finish_estimator",
        client_hash: "hash-1",
        unlock_date: today,
      },
    ]);
    const res = await handler(
      req("POST", "", {
        toolKey: "finish_estimator",
        clientHash: "hash-1",
        adProvider: "monetag",
        adToken: "monetag_unlock_1699999999",
      }),
    );
    expect(res.status).toBe(429);
    expect((await json(res)).code).toBe("DAILY_LIMIT");
  });

  it("enforces the cooldown window with 429", async () => {
    givenTool({ cooldown_minutes: 30, daily_usage_limit: 5 });
    const recent = new Date(Date.now() - 5 * 60_000).toISOString();
    givenRows("rewarded_unlock_log", [
      {
        tool_key: "finish_estimator",
        client_hash: "hash-1",
        unlock_date: new Date().toISOString().split("T")[0],
        unlocked_at: recent,
        expires_at: new Date(Date.now() + 60 * 60_000).toISOString(),
      },
    ]);
    const res = await handler(
      req("POST", "", {
        toolKey: "finish_estimator",
        clientHash: "hash-1",
        adProvider: "monetag",
        adToken: "monetag_unlock_1699999999",
      }),
    );
    expect(res.status).toBe(429);
    expect((await json(res)).code).toBe("COOLDOWN");
  });

  it("returns the existing expiry when still unlocked", async () => {
    givenTool();
    const expires = new Date(Date.now() + 60 * 60_000).toISOString();
    const today = new Date().toISOString().split("T")[0];
    givenRows("rewarded_unlock_log", [
      {
        tool_key: "finish_estimator",
        client_hash: "hash-1",
        unlock_date: today,
        unlocked_at: new Date(Date.now() - 10 * 60_000).toISOString(),
        expires_at: expires,
      },
    ]);
    const res = await handler(
      req("POST", "", {
        toolKey: "finish_estimator",
        clientHash: "hash-1",
        adProvider: "monetag",
        adToken: "monetag_unlock_1699999999",
      }),
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.success).toBe(true);
    expect(body.alreadyUnlocked).toBe(true);
    expect(body.expiresAt).toBe(expires);
  });
});

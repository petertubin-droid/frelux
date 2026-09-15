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

function givenReward(overrides: Record<string, any> = {}) {
  givenRows("reward_catalogue", [
    {
      reward_key: "ai_estimate_token",
      name: "AI Estimate Token",
      description: "One extra AI estimate.",
      reward_type: "ai_token",
      is_enabled: true,
      ...overrides,
    },
  ]);
}

describe("redeem-reward — credit redemption", () => {
  it("rejects unauthenticated callers with 401", async () => {
    const res = await handler(
      req("POST", "", { rewardKey: "ai_estimate_token", idempotencyKey: "k1" }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects missing rewardKey/idempotencyKey with 400", async () => {
    givenUser42();
    const res = await handler(req("POST", "", { rewardKey: "x" }, OWNER_AUTH));
    expect(res.status).toBe(400);
  });

  it("returns 404 for unknown or disabled rewards", async () => {
    givenUser42();
    givenReward({ is_enabled: false });
    const res = await handler(
      req(
        "POST",
        "",
        { rewardKey: "ai_estimate_token", idempotencyKey: "k1" },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(404);
  });

  it("redeems successfully and echoes the catalogue reward", async () => {
    givenUser42();
    givenReward();
    let captured: any = null;
    givenRpc("redeem_reward", (args: any) => {
      captured = args;
      return { data: [{ success: true, new_balance: 50 }], error: null };
    });
    const res = await handler(
      req(
        "POST",
        "",
        { rewardKey: "ai_estimate_token", idempotencyKey: "k1" },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.success).toBe(true);
    expect(body.newBalance).toBe(50);
    expect(body.reward.key).toBe("ai_estimate_token");
    expect(body.reward.type).toBe("ai_token");
    expect(captured.p_idempotency_key).toBe("k1");
  });

  it("maps insufficient credits to 402", async () => {
    givenUser42();
    givenReward();
    givenRpc("redeem_reward", () => ({
      data: [
        { success: false, error: "insufficient_credits", new_balance: 10 },
      ],
      error: null,
    }));
    const res = await handler(
      req(
        "POST",
        "",
        { rewardKey: "ai_estimate_token", idempotencyKey: "k1" },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(402);
  });

  it("maps an already-redeemed idempotency key to 409", async () => {
    givenUser42();
    givenReward();
    givenRpc("redeem_reward", () => ({
      data: [{ success: false, error: "already_redeemed", new_balance: 50 }],
      error: null,
    }));
    const res = await handler(
      req(
        "POST",
        "",
        { rewardKey: "ai_estimate_token", idempotencyKey: "k1" },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(409);
  });
});

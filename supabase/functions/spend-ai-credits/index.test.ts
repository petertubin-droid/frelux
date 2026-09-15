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

function givenFeature(overrides: Record<string, any> = {}) {
  givenRows("ai_feature_costs", [
    {
      feature_key: "ai_estimate",
      is_enabled: true,
      requires_credits: true,
      credit_cost: 8,
      ad_unlock_enabled: true,
      ...overrides,
    },
  ]);
}

describe("spend-ai-credits — atomic AI credit spend", () => {
  it("rejects unauthenticated callers with 401", async () => {
    const res = await handler(
      req("POST", "", { featureKey: "ai_estimate", idempotencyKey: "k1" }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects missing featureKey/idempotencyKey with 400", async () => {
    givenUser42();
    const res = await handler(
      req("POST", "", { featureKey: "ai_estimate" }, OWNER_AUTH),
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 for an unknown feature", async () => {
    givenUser42();
    const res = await handler(
      req("POST", "", { featureKey: "nope", idempotencyKey: "k1" }, OWNER_AUTH),
    );
    expect(res.status).toBe(404);
    expect((await json(res)).code).toBe("NOT_FOUND");
  });

  it("returns 403 when the feature is disabled", async () => {
    givenUser42();
    givenFeature({ is_enabled: false });
    const res = await handler(
      req(
        "POST",
        "",
        { featureKey: "ai_estimate", idempotencyKey: "k1" },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(403);
    expect((await json(res)).code).toBe("DISABLED");
  });

  it("treats a free feature as success with zero cost", async () => {
    givenUser42();
    givenFeature({ requires_credits: false });
    const res = await handler(
      req(
        "POST",
        "",
        { featureKey: "ai_estimate", idempotencyKey: "k1" },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.cost).toBe(0);
  });

  it("spends the DB-configured tiered cost atomically", async () => {
    givenUser42();
    givenFeature({ credit_cost: 12 });
    let captured: any = null;
    givenRpc("spend_credits", (args: any) => {
      captured = args;
      return { data: [{ success: true, new_balance: 30 }], error: null };
    });
    const res = await handler(
      req(
        "POST",
        "",
        { featureKey: "ai_estimate", idempotencyKey: "k1" },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.success).toBe(true);
    expect(body.cost).toBe(12);
    expect(body.newBalance).toBe(30);
    expect(captured.p_amount).toBe(12);
    expect(captured.p_idempotency_key).toBe("k1");
  });

  it("maps insufficient credits to 402 with the required amount", async () => {
    givenUser42();
    givenFeature({ credit_cost: 12 });
    givenRpc("spend_credits", () => ({
      data: [{ success: false, error: "insufficient_credits", new_balance: 3 }],
      error: null,
    }));
    const res = await handler(
      req(
        "POST",
        "",
        { featureKey: "ai_estimate", idempotencyKey: "k1" },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(402);
    const body = await json(res);
    expect(body.code).toBe("INSUFFICIENT_CREDITS");
    expect(body.requiredCredits).toBe(12);
    expect(body.currentBalance).toBe(3);
  });

  it("maps daily limit reached to 429", async () => {
    givenUser42();
    givenFeature();
    givenRpc("spend_credits", () => ({
      data: [{ success: false, error: "daily_limit_reached" }],
      error: null,
    }));
    const res = await handler(
      req(
        "POST",
        "",
        { featureKey: "ai_estimate", idempotencyKey: "k1" },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(429);
  });

  it("treats a repeat of the same idempotency key as already paid", async () => {
    givenUser42();
    givenFeature();
    givenRpc("spend_credits", () => ({
      data: [{ success: false, error: "already_spent", new_balance: 7 }],
      error: null,
    }));
    const res = await handler(
      req(
        "POST",
        "",
        { featureKey: "ai_estimate", idempotencyKey: "k1" },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.success).toBe(true);
    expect(body.cost).toBe(0);
    expect(body.message).toBe("Already paid");
  });
});

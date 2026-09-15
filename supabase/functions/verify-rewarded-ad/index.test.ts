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

function givenAdConfig(overrides: Record<string, any> = {}) {
  givenRows("rewarded_ad_credit_config", [
    { id: 1, credits_per_ad: 5, is_enabled: true, ...overrides },
  ]);
}

function givenActiveProvider() {
  givenRows("ad_providers", [
    { id: "p1", slug: "monetag", provider_type: "rewarded", is_active: true },
  ]);
}

describe("verify-rewarded-ad — ad completion verification", () => {
  it("rejects unauthenticated callers with 401", async () => {
    const res = await handler(
      req("POST", "", { adProvider: "monetag", adEventId: "e1" }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects missing adProvider/adEventId with 400", async () => {
    givenUser42();
    const res = await handler(
      req("POST", "", { adProvider: "monetag" }, OWNER_AUTH),
    );
    expect(res.status).toBe(400);
  });

  it("rejects an unverifiable ad with 403", async () => {
    givenUser42();
    const res = await handler(
      req("POST", "", { adProvider: "monetag", adEventId: "e1" }, OWNER_AUTH),
    );
    expect(res.status).toBe(403);
    expect((await json(res)).code).toBe("AD_NOT_VERIFIED");
  });

  it("awards credits on a valid client attestation from an ACTIVE provider", async () => {
    givenUser42();
    givenActiveProvider();
    givenAdConfig();
    let captured: any = null;
    givenRpc("award_ad_credits", (args: any) => {
      captured = args;
      return { data: [{ success: true, new_balance: 45 }], error: null };
    });
    const res = await handler(
      req(
        "POST",
        "",
        {
          adProvider: "monetag",
          adEventId: "e1",
          adToken: "att_monetag_earn_credits_1699999999",
          mode: "earn_credits",
        },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.success).toBe(true);
    expect(body.creditsEarned).toBe(5);
    expect(body.newBalance).toBe(45);
    expect(captured.p_amount).toBe(5);
    expect(captured.p_user_id).toBe(USER_ID);
  });

  it("rejects an attestation naming an inactive provider", async () => {
    givenUser42();
    givenRows("ad_providers", [
      { id: "p1", slug: "monetag", is_active: false },
    ]);
    const res = await handler(
      req(
        "POST",
        "",
        {
          adProvider: "monetag",
          adEventId: "e1",
          adToken: "att_monetag_earn_credits_1699999999",
        },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(403);
  });

  it("returns 403 when rewarded ads are disabled in config", async () => {
    givenUser42();
    givenActiveProvider();
    givenAdConfig({ is_enabled: false });
    const res = await handler(
      req(
        "POST",
        "",
        {
          adProvider: "monetag",
          adEventId: "e1",
          adToken: "att_monetag_earn_credits_1699999999",
        },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(403);
    expect((await json(res)).code).toBe("DISABLED");
  });

  it("maps an already-awarded ad event to 409", async () => {
    givenUser42();
    givenActiveProvider();
    givenAdConfig();
    givenRpc("award_ad_credits", () => ({
      data: [{ success: false, error: "already_awarded", new_balance: 45 }],
      error: null,
    }));
    const res = await handler(
      req(
        "POST",
        "",
        {
          adProvider: "monetag",
          adEventId: "e1",
          adToken: "att_monetag_earn_credits_1699999999",
        },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(409);
  });

  it("maps the daily earn limit to 429", async () => {
    givenUser42();
    givenActiveProvider();
    givenAdConfig();
    givenRpc("award_ad_credits", () => ({
      data: [{ success: false, error: "daily_earn_limit", new_balance: 50 }],
      error: null,
    }));
    const res = await handler(
      req(
        "POST",
        "",
        {
          adProvider: "monetag",
          adEventId: "e1",
          adToken: "att_monetag_earn_credits_1699999999",
        },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(429);
  });

  it("unlocks a feature in unlock_feature mode", async () => {
    givenUser42();
    givenActiveProvider();
    givenRpc("unlock_ai_feature_via_ad", () => ({
      data: [{ success: true }],
      error: null,
    }));
    const res = await handler(
      req(
        "POST",
        "",
        {
          adProvider: "monetag",
          adEventId: "e1",
          adToken: "att_monetag_unlock_1699999999",
          mode: "unlock_feature",
          featureKey: "ai_estimate",
        },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.success).toBe(true);
    expect(body.featureKey).toBe("ai_estimate");
  });

  it("requires featureKey in unlock_feature mode", async () => {
    givenUser42();
    givenActiveProvider();
    const res = await handler(
      req(
        "POST",
        "",
        {
          adProvider: "monetag",
          adEventId: "e1",
          adToken: "att_monetag_x_1699999999",
          mode: "unlock_feature",
        },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(400);
  });
});

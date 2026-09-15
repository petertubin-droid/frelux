// =========================================================
// paystack-webhook tests — real-money surface. Covers the
// HMAC signature gate, audit H1 (a signed charge must match
// the canonical server-side price before activation), the
// token/api_plan/refund branches, and honest skips.
// =========================================================
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import "./index.ts";
import {
  getHandler,
  givenRows,
  givenRpc,
  req,
  json,
  state,
  tableFixtures,
} from "../_shared/testing/harness.ts";

const handler = getHandler();

const SECRET = "sk_test_wh_123";
beforeEach(() => {
  // upserted rows leak across tests otherwise (fixtures persist per file)
  givenRows("user_paid_status", []);
  state.env.PAYSTACK_SECRET_KEY = SECRET;
});
afterEach(() => {
  delete state.env.PAYSTACK_SECRET_KEY;
});

function sign(payload: object): string {
  return createHmac("sha256", SECRET)
    .update(JSON.stringify(payload))
    .digest("hex");
}

function signedReq(event: string, data: Record<string, unknown>) {
  const payload = { event, data };
  return handler(
    req("POST", "", payload, { "x-paystack-signature": sign(payload) }),
  );
}

const PRICES = [
  { plan: "pro", billing_cycle: "monthly", price_kobo: 500000, active: true },
];

describe("paystack-webhook — signed payment events", () => {
  it("rejects requests without a signature", async () => {
    const res = await handler(
      req("POST", "", { event: "charge.success", data: { status: "success" } }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects requests with a wrong signature", async () => {
    const payload = { event: "charge.success", data: { status: "success" } };
    const res = await handler(
      req("POST", "", payload, { "x-paystack-signature": "deadbeef" }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects everything when no secret key is configured", async () => {
    delete state.env.PAYSTACK_SECRET_KEY;
    const payload = { event: "charge.success", data: { status: "success" } };
    const res = await handler(
      req("POST", "", payload, { "x-paystack-signature": "anything" }),
    );
    expect(res.status).toBe(401);
  });

  it("acknowledges non-payment events without processing", async () => {
    const res = await signedReq("transfer.success", { status: "success" });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.skipped).toBe(true);
    expect(tableFixtures.get("user_paid_status")?.length ?? 0).toBe(0);
  });

  it("acknowledges non-success charges without activating", async () => {
    givenRows("subscription_plan_prices", PRICES);
    const res = await signedReq("charge.success", {
      status: "failed",
      amount: 500000,
      reference: "ref-f1",
      metadata: { plan: "pro", user_id: "u-1" },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.status).toBe("failed");
    expect(tableFixtures.get("user_paid_status")?.length ?? 0).toBe(0);
  });

  it("activates a subscription when the paid amount matches the canonical price", async () => {
    givenRows("subscription_plan_prices", PRICES);
    const res = await signedReq("charge.success", {
      status: "success",
      amount: 500000,
      reference: "ref-ok1",
      customer: { customer_code: "cc_1" },
      metadata: {
        plan: "pro",
        billing_cycle: "monthly",
        user_id: "u-1",
      },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.activated).toBe(true);
    expect(body.plan).toBe("pro");
    const rows = tableFixtures.get("user_paid_status");
    expect(rows?.length).toBe(1);
    expect(rows[0].is_paid).toBe(true);
    expect(rows[0].plan).toBe("pro");
    expect(rows[0].payment_provider).toBe("paystack");
    expect(rows[0].paid_until).toBeTruthy();
  });

  it("audit H1: a signed ₦1 charge never activates a paid plan", async () => {
    givenRows("subscription_plan_prices", PRICES);
    const res = await signedReq("charge.success", {
      status: "success",
      amount: 100,
      reference: "ref-cheap",
      metadata: { plan: "pro", billing_cycle: "monthly", user_id: "u-1" },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.activated).toBe(false);
    expect(body.reason).toBe("AMOUNT_MISMATCH");
    expect(tableFixtures.get("user_paid_status")?.length ?? 0).toBe(0);
  });

  it("refuses activation for plans with no configured price", async () => {
    givenRows("subscription_plan_prices", PRICES);
    const res = await signedReq("charge.success", {
      status: "success",
      amount: 500000,
      reference: "ref-x1",
      metadata: {
        plan: "enterprise",
        billing_cycle: "monthly",
        user_id: "u-1",
      },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.activated).toBe(false);
    expect(body.reason).toBe("PLAN_NOT_CONFIGURED");
  });

  it("credits tokens idempotently via the RPC ledger", async () => {
    const calls: any[] = [];
    givenRpc("credit_token_purchase", (args) => {
      calls.push(args);
      return {
        data: [{ already_credited: false, new_balance: 150 }],
        error: null,
      };
    });
    const res = await signedReq("charge.success", {
      status: "success",
      amount: 100000,
      reference: "ref-tok1",
      metadata: { purpose: "token_purchase", user_id: "u-2", tokens: 50 },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.tokens_credited).toBe(50);
    expect(calls.length).toBe(1);
    expect(calls[0].p_reference).toBe("ref-tok1");
    expect(calls[0].p_tokens).toBe(50);
    expect(calls[0].p_amount_kobo).toBe(100000);
  });

  it("maps a token-credit RPC failure to 500 (never silently swallowed)", async () => {
    givenRpc("credit_token_purchase", () => ({
      data: null,
      error: { message: "ledger locked" },
    }));
    const res = await signedReq("charge.success", {
      status: "success",
      amount: 100000,
      reference: "ref-tok2",
      metadata: { purpose: "token_purchase", user_id: "u-2", tokens: 50 },
    });
    expect(res.status).toBe(500);
    expect((await json(res)).error).toBe("ledger locked");
  });

  it("grants an API plan entitlement only from the signed webhook", async () => {
    const calls: any[] = [];
    givenRpc("frelux_api_apply_plan_purchase", (args) => {
      calls.push(args);
      return { data: true, error: null };
    });
    const res = await signedReq("charge.success", {
      status: "success",
      amount: 2000,
      reference: "ref-api1",
      metadata: {
        purpose: "api_plan",
        user_id: "u-3",
        plan_key: "dev_pro",
        currency: "USD",
      },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.api_plan_applied).toBe(true);
    expect(calls.length).toBe(1);
    expect(calls[0].p_plan_key).toBe("dev_pro");
    expect(calls[0].p_provider_reference).toBe("ref-api1");
    expect(calls[0].p_amount).toBe(2000);
    expect(calls[0].p_currency).toBe("USD");
  });

  it("downgrades idempotently on charge.refunded", async () => {
    const calls: any[] = [];
    givenRpc("frelux_api_record_refund", (args) => {
      calls.push(args);
      return { data: null, error: null };
    });
    const res = await signedReq("charge.refunded", {
      reference: "ref-api1",
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.refunded).toBe(true);
    expect(calls.length).toBe(1);
    expect(calls[0].p_provider_reference).toBe("ref-api1");
  });

  it("reports missing metadata honestly (400, not a fake success)", async () => {
    const res = await signedReq("charge.success", {
      status: "success",
      amount: 500000,
      reference: "ref-m1",
      metadata: {},
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error).toBe("Missing plan or user_id");
  });
});

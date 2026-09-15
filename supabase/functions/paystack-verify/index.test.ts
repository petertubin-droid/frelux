// =========================================================
// paystack-verify tests — post-checkout verification. Covers
// the token-purchase credit path (idempotent, amount-sanity),
// and the subscription activation gate (caller must be the
// buyer; amount must match the canonical price).
// =========================================================
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "./index.ts";
import {
  getHandler,
  givenUser,
  givenRows,
  givenRpc,
  req,
  json,
  state,
  tableFixtures,
} from "../_shared/testing/harness.ts";

const handler = getHandler();

let reqNo = 0;
function rreq(
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  reqNo += 1;
  return handler(
    req("POST", "", body, { "x-user-id": `t-${reqNo}`, ...headers }),
  );
}

/** Stub global fetch — serves Paystack transaction/verify lookups. */
function stubVerifyReply(payload: Record<string, unknown>): () => void {
  const orig = (globalThis as any).fetch;
  (globalThis as any).fetch = async (input: any) => {
    const url =
      typeof input === "string" ? input : (input?.url ?? String(input));
    if (!url.includes("api.paystack.co/transaction/verify/")) {
      throw new Error(`unexpected fetch: ${url}`);
    }
    return new Response(JSON.stringify(payload), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return () => {
    (globalThis as any).fetch = orig;
  };
}

// upserted rows leak across tests otherwise (fixtures persist per file)
beforeEach(() => {
  givenRows("user_paid_status", []);
});

const restores: Array<() => void> = [];
afterEach(() => {
  restores.forEach((r) => r());
  restores.length = 0;
  delete state.env.PAYSTACK_SECRET_KEY;
});

const USER_ID = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";
const auth = { Authorization: "Bearer tok" };
const PRICES = [
  { plan: "pro", billing_cycle: "monthly", price_kobo: 500000, active: true },
];

function successTx(overrides: Record<string, unknown> = {}) {
  return {
    status: true,
    data: {
      status: "success",
      amount: 500000,
      reference: "ref-v1",
      metadata: {
        purpose: "subscription",
        plan: "pro",
        billing_cycle: "monthly",
        user_id: USER_ID,
      },
      ...overrides,
    },
  };
}

describe("paystack-verify — verify transaction", () => {
  it("requires a reference", async () => {
    const res = await rreq({});
    expect(res.status).toBe(400);
    expect((await json(res)).error).toBe("Missing reference");
  });

  it("requires the payment provider to be configured", async () => {
    const res = await rreq({ reference: "ref-v1" });
    expect(res.status).toBe(500);
    expect((await json(res)).error).toBe("Payment provider not configured");
  });

  it("reports a failed Paystack verification", async () => {
    state.env.PAYSTACK_SECRET_KEY = "sk_test_live";
    restores.push(
      stubVerifyReply({ status: false, message: "Transaction not found" }),
    );
    const res = await rreq({ reference: "ref-missing" });
    expect(res.status).toBe(400);
    expect((await json(res)).error).toBe("Transaction not found");
  });

  it("reports a non-success transaction without activating anything", async () => {
    state.env.PAYSTACK_SECRET_KEY = "sk_test_live";
    restores.push(
      stubVerifyReply(
        successTx({
          status: "abandoned",
          metadata: { purpose: "subscription", plan: "pro", user_id: USER_ID },
        }),
      ),
    );
    const res = await rreq({ reference: "ref-v1" });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.status).toBe(false);
    expect(body.message).toBe("Payment abandoned");
    expect(tableFixtures.get("user_paid_status")?.length ?? 0).toBe(0);
  });

  it("credits tokens idempotently and reports the balance", async () => {
    state.env.PAYSTACK_SECRET_KEY = "sk_test_live";
    const calls: any[] = [];
    givenRpc("credit_token_purchase", (args) => {
      calls.push(args);
      return {
        data: [{ already_credited: false, new_balance: 150 }],
        error: null,
      };
    });
    restores.push(
      stubVerifyReply(
        successTx({
          amount: 100000,
          metadata: {
            purpose: "token_purchase",
            user_id: USER_ID,
            tokens: 50,
            price_kobo: 100000,
          },
        }),
      ),
    );
    const res = await rreq({ reference: "ref-tok9" });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.status).toBe(true);
    expect(body.message).toContain("50 tokens");
    expect(body.data.purpose).toBe("token_purchase");
    expect(body.data.new_balance).toBe(150);
    expect(calls.length).toBe(1);
    expect(calls[0].p_reference).toBe("ref-tok9");
  });

  it("reports an already-credited token purchase instead of double-crediting", async () => {
    state.env.PAYSTACK_SECRET_KEY = "sk_test_live";
    let calls = 0;
    givenRpc("credit_token_purchase", () => {
      calls += 1;
      return {
        data: [{ already_credited: true, new_balance: 150 }],
        error: null,
      };
    });
    restores.push(
      stubVerifyReply(
        successTx({
          amount: 100000,
          metadata: {
            purpose: "token_purchase",
            user_id: USER_ID,
            tokens: 50,
            price_kobo: 100000,
          },
        }),
      ),
    );
    const res = await rreq({ reference: "ref-tok9" });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.message).toContain("already credited");
    expect(body.data.already_credited).toBe(true);
    expect(calls).toBe(1);
  });

  it("refuses to credit tokens when the paid amount mismatches the price", async () => {
    state.env.PAYSTACK_SECRET_KEY = "sk_test_live";
    let calls = 0;
    givenRpc("credit_token_purchase", () => {
      calls += 1;
      return { data: null, error: null };
    });
    restores.push(
      stubVerifyReply(
        successTx({
          amount: 100, // paid ₦1
          metadata: {
            purpose: "token_purchase",
            user_id: USER_ID,
            tokens: 50,
            price_kobo: 100000,
          },
        }),
      ),
    );
    const res = await rreq({ reference: "ref-tok-bad" });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.status).toBe(false);
    expect(body.message).toBe("Amount paid does not match token price");
    expect(calls).toBe(0);
  });

  it("activates a subscription for the authenticated buyer at the right price", async () => {
    state.env.PAYSTACK_SECRET_KEY = "sk_test_live";
    givenUser({ id: USER_ID, email: "buyer@test.local" });
    givenRows("subscription_plan_prices", PRICES);
    restores.push(stubVerifyReply(successTx()));
    const res = await rreq({ reference: "ref-v1" }, auth);
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.status).toBe(true);
    expect(body.data.activated_plan).toBe("pro");
    expect(body.data.paid_until).toBeTruthy();
    const rows = tableFixtures.get("user_paid_status");
    expect(rows?.length).toBe(1);
    expect(rows[0].is_paid).toBe(true);
    expect(rows[0].plan).toBe("pro");
  });

  it("refuses activation when the caller is not the buyer", async () => {
    state.env.PAYSTACK_SECRET_KEY = "sk_test_live";
    givenUser({ id: "00000000-0000-4000-8000-000000000000" });
    givenRows("subscription_plan_prices", PRICES);
    restores.push(stubVerifyReply(successTx()));
    const res = await rreq({ reference: "ref-v1" }, auth);
    expect(res.status).toBe(401);
    expect((await json(res)).error).toContain("user mismatch");
    expect(tableFixtures.get("user_paid_status")?.length ?? 0).toBe(0);
  });

  it("refuses activation when the paid amount mismatches the canonical price", async () => {
    state.env.PAYSTACK_SECRET_KEY = "sk_test_live";
    givenUser({ id: USER_ID, email: "buyer@test.local" });
    givenRows("subscription_plan_prices", PRICES);
    restores.push(stubVerifyReply(successTx({ amount: 100 })));
    const res = await rreq({ reference: "ref-v1" }, auth);
    expect(res.status).toBe(400);
    expect((await json(res)).error).toContain("does not match");
    expect(tableFixtures.get("user_paid_status")?.length ?? 0).toBe(0);
  });

  it("refuses activation for unauthenticated callers", async () => {
    state.env.PAYSTACK_SECRET_KEY = "sk_test_live";
    givenRows("subscription_plan_prices", PRICES);
    restores.push(stubVerifyReply(successTx()));
    const res = await rreq({ reference: "ref-v1" });
    expect(res.status).toBe(401);
  });
});

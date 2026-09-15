// =========================================================
// paystack-checkout tests — server-side pricing authority.
// The client amount is never trusted: subscriptions price from
// subscription_plan_prices, token purchases from
// token_purchase_config, API plans from frelux_api_plans.
// =========================================================
import { describe, it, expect, afterEach } from "vitest";
import "./index.ts";
import {
  getHandler,
  givenUser,
  givenRows,
  req,
  json,
  state,
} from "../_shared/testing/harness.ts";

const handler = getHandler();

let reqNo = 0;
/** Unique rate-limit key per request. */
function rreq(
  body: unknown,
  headers: Record<string, string> = {},
): Promise<Response> {
  reqNo += 1;
  return handler(
    req("POST", "", body, { "x-user-id": `t-${reqNo}`, ...headers }),
  );
}

/** Stub global fetch — captures the Paystack initialize call. */
let paystackCalls: Array<{ url: string; body: any }> = [];
function stubPaystack(
  respond: (body: any) => Record<string, unknown> = (body) => body,
): () => void {
  const orig = (globalThis as any).fetch;
  (globalThis as any).fetch = async (input: any, init?: any) => {
    const url =
      typeof input === "string" ? input : (input?.url ?? String(input));
    const parsed = init?.body ? JSON.parse(init.body) : {};
    paystackCalls.push({ url, body: parsed });
    return new Response(JSON.stringify(respond(parsed)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };
  return () => {
    (globalThis as any).fetch = orig;
    paystackCalls = [];
  };
}

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

function givenBuyer() {
  givenUser({ id: USER_ID, email: "buyer@test.local" });
}

describe("paystack-checkout — initialize transaction", () => {
  it("requires the payment provider to be configured", async () => {
    givenBuyer();
    givenRows("subscription_plan_prices", PRICES);
    const restore = stubPaystack();
    restores.push(restore);
    const res = await rreq(
      {
        email: "buyer@test.local",
        reference: "ref-1",
        plan: "pro",
        billing_cycle: "monthly",
        user_id: USER_ID,
        amount: 500000,
      },
      auth,
    );
    expect(res.status).toBe(500);
    expect((await json(res)).error).toBe("Payment provider not configured");
  });

  it("prices subscriptions server-side — a client amount of ₦1 is ignored", async () => {
    state.env.PAYSTACK_SECRET_KEY = "sk_test_live";
    givenBuyer();
    givenRows("subscription_plan_prices", PRICES);
    restores.push(
      stubPaystack(() => ({
        status: true,
        message: "Authorization URL created",
        data: {
          authorization_url: "https://checkout.paystack.co/xyz",
          access_code: "ac_1",
          reference: "ref-1",
        },
      })),
    );
    const res = await rreq(
      {
        email: "buyer@test.local",
        reference: "ref-1",
        plan: "pro",
        billing_cycle: "monthly",
        user_id: USER_ID,
        amount: 1, // hostile client amount — must be ignored
      },
      auth,
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.authorization_url).toContain("paystack.co");
    expect(paystackCalls.length).toBe(1);
    expect(paystackCalls[0].url).toBe(
      "https://api.paystack.co/transaction/initialize",
    );
    expect(paystackCalls[0].body.amount).toBe(500000);
    expect(paystackCalls[0].body.reference).toBe("ref-1");
    expect(paystackCalls[0].body.metadata.plan).toBe("pro");
  });

  it("refuses plans with no configured price", async () => {
    state.env.PAYSTACK_SECRET_KEY = "sk_test_live";
    givenBuyer();
    givenRows("subscription_plan_prices", PRICES);
    restores.push(stubPaystack());
    const res = await rreq(
      {
        email: "buyer@test.local",
        reference: "ref-2",
        plan: "enterprise",
        billing_cycle: "monthly",
        user_id: USER_ID,
        amount: 100,
      },
      auth,
    );
    expect(res.status).toBe(400);
    expect((await json(res)).error).toContain(
      "not available for self-service purchase",
    );
    expect(paystackCalls.length).toBe(0);
  });

  it("rejects a caller subscribing someone else (user mismatch)", async () => {
    state.env.PAYSTACK_SECRET_KEY = "sk_test_live";
    givenBuyer();
    givenRows("subscription_plan_prices", PRICES);
    restores.push(stubPaystack());
    const res = await rreq(
      {
        email: "victim@test.local",
        reference: "ref-3",
        plan: "pro",
        billing_cycle: "monthly",
        user_id: "00000000-0000-4000-8000-000000000000",
        amount: 500000,
      },
      auth,
    );
    expect(res.status).toBe(401);
    expect(paystackCalls.length).toBe(0);
  });

  it("validates required fields", async () => {
    const res = await rreq({ plan: "pro" }, auth);
    expect(res.status).toBe(400);
    expect((await json(res)).error).toBe("Missing required fields");
  });

  it("prices token purchases from token_purchase_config — server-side only", async () => {
    state.env.PAYSTACK_SECRET_KEY = "sk_test_live";
    givenBuyer();
    givenRows("token_purchase_config", [
      { id: 1, token_amount: 50, price_kobo: 100000, is_enabled: true },
    ]);
    restores.push(
      stubPaystack(() => ({
        status: true,
        data: { authorization_url: "https://checkout.paystack.co/tok" },
      })),
    );
    const res = await rreq(
      {
        purpose: "token_purchase",
        email: "buyer@test.local",
        user_id: USER_ID,
        amount: 1, // hostile client amount
      },
      auth,
    );
    expect(res.status).toBe(200);
    expect(paystackCalls.length).toBe(1);
    expect(paystackCalls[0].body.amount).toBe(100000);
    expect(paystackCalls[0].body.metadata.purpose).toBe("token_purchase");
    expect(paystackCalls[0].body.metadata.tokens).toBe(50);
    expect(paystackCalls[0].body.reference).toMatch(/^FRELUX_TOKENS_/);
    expect(paystackCalls[0].body.callback_url).toContain(
      "/rewards?token_purchase=verify",
    );
  });

  it("refuses token purchases when disabled in config", async () => {
    state.env.PAYSTACK_SECRET_KEY = "sk_test_live";
    givenBuyer();
    givenRows("token_purchase_config", [
      { id: 1, token_amount: 50, price_kobo: 100000, is_enabled: false },
    ]);
    restores.push(stubPaystack());
    const res = await rreq(
      {
        purpose: "token_purchase",
        email: "buyer@test.local",
        user_id: USER_ID,
      },
      auth,
    );
    expect(res.status).toBe(400);
    expect((await json(res)).error).toBe("Token purchases are not available");
    expect(paystackCalls.length).toBe(0);
  });

  it("prices API plans from frelux_api_plans with server-side reference", async () => {
    state.env.PAYSTACK_SECRET_KEY = "sk_test_live";
    givenBuyer();
    givenRows("frelux_api_plans", [
      {
        key: "dev_pro",
        name: "Dev Pro",
        active: true,
        config: { priceMonthly: 20, currency: "USD" },
      },
    ]);
    restores.push(
      stubPaystack(() => ({
        status: true,
        data: { authorization_url: "https://checkout.paystack.co/api" },
      })),
    );
    const res = await rreq(
      {
        purpose: "api_plan",
        plan: "dev_pro",
        user_id: USER_ID,
        amount: 1, // hostile client amount
      },
      auth,
    );
    expect(res.status).toBe(200);
    expect(paystackCalls.length).toBe(1);
    expect(paystackCalls[0].body.amount).toBe(2000); // $20 → cents
    expect(paystackCalls[0].body.currency).toBe("USD");
    expect(paystackCalls[0].body.reference).toMatch(/^FRELUX_API_dev_pro_/);
    expect(paystackCalls[0].body.metadata.purpose).toBe("api_plan");
    expect(paystackCalls[0].body.metadata.plan_key).toBe("dev_pro");
  });

  it("refuses API plans that are free or contact-sales", async () => {
    state.env.PAYSTACK_SECRET_KEY = "sk_test_live";
    givenBuyer();
    givenRows("frelux_api_plans", [
      { key: "free", name: "Free", active: true, config: { priceMonthly: 0 } },
    ]);
    restores.push(stubPaystack());
    const res = await rreq(
      { purpose: "api_plan", plan: "free", user_id: USER_ID },
      auth,
    );
    expect(res.status).toBe(400);
    expect((await json(res)).error).toContain("not available for self-service");
    expect(paystackCalls.length).toBe(0);
  });

  it("refuses inactive API plans", async () => {
    state.env.PAYSTACK_SECRET_KEY = "sk_test_live";
    givenBuyer();
    givenRows("frelux_api_plans", [
      {
        key: "dev_pro",
        name: "Dev Pro",
        active: false,
        config: { priceMonthly: 20, currency: "USD" },
      },
    ]);
    restores.push(stubPaystack());
    const res = await rreq(
      { purpose: "api_plan", plan: "dev_pro", user_id: USER_ID },
      auth,
    );
    expect(res.status).toBe(400);
    expect((await json(res)).error).toBe("Unknown or inactive API plan");
  });

  it("propagates a Paystack initialization failure honestly", async () => {
    state.env.PAYSTACK_SECRET_KEY = "sk_test_live";
    givenBuyer();
    givenRows("subscription_plan_prices", PRICES);
    const orig = (globalThis as any).fetch;
    (globalThis as any).fetch = async () =>
      new Response(JSON.stringify({ message: "Invalid key" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    restores.push(() => {
      (globalThis as any).fetch = orig;
    });
    const res = await rreq(
      {
        email: "buyer@test.local",
        reference: "ref-9",
        plan: "pro",
        billing_cycle: "monthly",
        user_id: USER_ID,
        amount: 500000,
      },
      auth,
    );
    expect(res.status).toBe(401);
    expect((await json(res)).error).toBe("Invalid key");
  });
});

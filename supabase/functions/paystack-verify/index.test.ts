// Unit tests for paystack-verify subscription activation.
// Audit fix (2026-10-09): replaying a successful reference must NOT
// re-extend paid_until; activation goes through the idempotent
// apply_subscription_purchase RPC. Also covers the caller-identity
// (H1) and amount-validation gates.
import "./index.ts";
import {
  getHandler,
  givenRows,
  givenRpc,
  givenUser,
  req,
  resetCapture,
  state,
} from "../_shared/testing/harness.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const handler = getHandler();

const USER = { id: "11111111-1111-1111-1111-111111111111" };

const REFERENCE = "FRELUX_test_ref_123";

function paystackTx(overrides: Record<string, unknown> = {}) {
  return {
    status: "success",
    amount: 150000,
    currency: "NGN",
    reference: REFERENCE,
    customer: { customer_code: "CUS_x" },
    metadata: {
      purpose: "subscription",
      plan: "basic",
      billing_cycle: "monthly",
      user_id: USER.id,
    },
    ...overrides,
  };
}

let rpcCalls: Array<Record<string, unknown>> = [];

beforeEach(() => {
  resetCapture();
  state.env.PAYSTACK_SECRET_KEY = "sk_test";
  state.env.SUPABASE_URL = "https://test.supabase.co";
  state.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  rpcCalls = [];
  givenUser(USER);
  // Canonical price for basic/monthly = 150000 kobo.
  givenRows("subscription_plan_prices", [
    {
      plan: "basic",
      billing_cycle: "monthly",
      price_kobo: 150000,
      active: true,
    },
  ]);
  givenRpc("apply_subscription_purchase", (args) => {
    rpcCalls.push(args as Record<string, unknown>);
    return {
      data: [
        {
          applied: true,
          already_applied: false,
          paid_until: "2026-11-08T00:00:00Z",
        },
      ],
      error: null,
    };
  });
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      if (String(url).includes("api.paystack.co/transaction/verify")) {
        return new Response(
          JSON.stringify({ status: true, data: paystackTx() }),
          { status: 200 },
        );
      }
      return new Response("{}", { status: 404 });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function authedReq(body: unknown) {
  return req("POST", "", body, {
    Authorization: `Bearer token-for-${USER.id}`,
    "x-forwarded-for": `10.9.0.${Math.floor(Math.random() * 250)}`,
  });
}

describe("paystack-verify subscription activation", () => {
  it("activates through the idempotent RPC, not a raw upsert", async () => {
    const res = await handler(authedReq({ reference: REFERENCE }));
    expect(res.status).toBe(200);
    const body = JSON.parse(await res.text());
    expect(body.status).toBe(true);
    expect(body.message).toContain("activated successfully");
    expect(rpcCalls.length).toBe(1);
    expect(rpcCalls[0].p_reference).toBe(REFERENCE);
    expect(rpcCalls[0].p_provider).toBe("paystack");
    expect(rpcCalls[0].p_days).toBe(30);
    expect(rpcCalls[0].p_amount_kobo).toBe(150000);
  });

  it("reports an already-processed reference without re-granting", async () => {
    givenRpc("apply_subscription_purchase", () => ({
      data: [{ applied: false, already_applied: true, paid_until: null }],
      error: null,
    }));
    const res = await handler(authedReq({ reference: REFERENCE }));
    expect(res.status).toBe(200);
    const body = JSON.parse(await res.text());
    expect(body.status).toBe(true);
    expect(body.data.already_activated).toBe(true);
    expect(body.message).toContain("already activated");
  });

  it("rejects a caller that is not the metadata user", async () => {
    givenUser({ id: "22222222-2222-2222-2222-222222222222" });
    const res = await handler(authedReq({ reference: REFERENCE }));
    expect(res.status).toBe(401);
    expect(rpcCalls.length).toBe(0);
  });

  it("rejects a paid amount that does not match the canonical price", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              status: true,
              data: paystackTx({ amount: 1000 }),
            }),
            { status: 200 },
          ),
      ),
    );
    const res = await handler(authedReq({ reference: REFERENCE }));
    const body = JSON.parse(await res.text());
    expect(res.status).toBe(400);
    expect(body.error).toMatch(/does not match|not configured/i);
    expect(rpcCalls.length).toBe(0);
  });

  it("rejects a failed transaction without touching the ledger", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              status: true,
              data: paystackTx({ status: "failed" }),
            }),
            { status: 200 },
          ),
      ),
    );
    const res = await handler(authedReq({ reference: REFERENCE }));
    expect(res.status).toBe(200);
    const body = JSON.parse(await res.text());
    expect(body.status).toBe(false);
    expect(rpcCalls.length).toBe(0);
  });
});

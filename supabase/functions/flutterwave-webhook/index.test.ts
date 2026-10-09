// Unit tests for flutterwave-webhook.
// Gates: verif-hash secret check, price validation, and
// reference-idempotent subscription activation (audit fix 2026-10-09).
import "./index.ts";
import {
  getHandler,
  givenRows,
  givenRpc,
  req,
  resetCapture,
  state,
} from "../_shared/testing/harness.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const handler = getHandler();

const USER_ID = "11111111-1111-1111-1111-111111111111";
const SECRET_HASH = "flw_verif_hash_test";

function payload(overrides: Record<string, unknown> = {}) {
  return {
    event: "charge.completed",
    data: {
      status: "successful",
      currency: "NGN",
      amount: 1500, // major units
      tx_ref: "FLW_wh_ref_001",
      customer: { email: "buyer@example.com" },
      meta: {
        plan: "basic",
        billing_cycle: "monthly",
        user_id: USER_ID,
      },
      ...overrides,
    },
  };
}

let rpcCalls: Array<Record<string, unknown>> = [];

beforeEach(() => {
  resetCapture();
  state.env.FLW_SECRET_HASH = SECRET_HASH;
  state.env.SUPABASE_URL = "https://test.supabase.co";
  state.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  rpcCalls = [];
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
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function whReq(body: unknown, verifHash: string) {
  return req("POST", "", body, {
    "verif-hash": verifHash,
    "x-forwarded-for": `10.21.0.${Math.floor(Math.random() * 250)}`,
  });
}

describe("flutterwave-webhook", () => {
  it("activates a valid signed charge.completed via the idempotent RPC", async () => {
    const res = await handler(whReq(payload(), SECRET_HASH));
    expect(res.status).toBe(200);
    const out = JSON.parse(await res.text());
    expect(out.received).toBe(true);
    expect(out.activated).toBe(true);
    expect(rpcCalls.length).toBe(1);
    expect(rpcCalls[0].p_reference).toBe("FLW_wh_ref_001");
    expect(rpcCalls[0].p_provider).toBe("flutterwave");
  });

  it("rejects a wrong verif-hash with 401", async () => {
    const res = await handler(whReq(payload(), "wrong-hash"));
    expect(res.status).toBe(401);
    expect(rpcCalls.length).toBe(0);
  });

  it("does not re-grant when the tx_ref was already processed", async () => {
    givenRpc("apply_subscription_purchase", () => ({
      data: [{ applied: false, already_applied: true, paid_until: null }],
      error: null,
    }));
    const res = await handler(whReq(payload(), SECRET_HASH));
    expect(res.status).toBe(200);
    const out = JSON.parse(await res.text());
    expect(out.received).toBe(true);
    expect(out.already_activated).toBe(true);
  });

  it("acknowledges an amount that fails price validation without activating", async () => {
    const res = await handler(whReq(payload({ amount: 10 }), SECRET_HASH));
    expect(res.status).toBe(200);
    const out = JSON.parse(await res.text());
    expect(out.received).toBe(true);
    expect(out.activated).toBe(false);
    expect(rpcCalls.length).toBe(0);
  });
});

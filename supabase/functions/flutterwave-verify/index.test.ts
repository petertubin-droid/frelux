// Unit tests for flutterwave-verify subscription activation.
// Audit fix (2026-10-09): replaying a successful tx_ref must not
// re-extend paid_until; activation goes through the idempotent
// apply_subscription_purchase RPC.
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
const TX_REF = "FLW_test_ref_001";

let rpcCalls: Array<Record<string, unknown>> = [];

function flwTx(overrides: Record<string, unknown> = {}) {
  return {
    status: "successful",
    currency: "NGN",
    amount: 1500, // major units
    tx_ref: TX_REF,
    customer: { email: "buyer@example.com" },
    meta: {
      purpose: "subscription",
      plan: "basic",
      billing_cycle: "monthly",
      user_id: USER.id,
    },
    ...overrides,
  };
}

beforeEach(() => {
  resetCapture();
  state.env.FLUTTERWAVE_SECRET_KEY = "flw_test";
  state.env.SUPABASE_URL = "https://test.supabase.co";
  state.env.SUPABASE_SERVICE_ROLE_KEY = "service-key";
  rpcCalls = [];
  givenUser(USER);
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
      if (String(url).includes("api.flutterwave.com")) {
        return new Response(
          JSON.stringify({ status: "success", data: flwTx() }),
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

describe("flutterwave-verify subscription activation", () => {
  it("activates through the idempotent RPC", async () => {
    const res = await handler(
      req("POST", "", { tx_ref: TX_REF }, { "x-forwarded-for": "10.20.0.5" }),
    );
    expect(res.status).toBe(200);
    const body = JSON.parse(await res.text());
    expect(body.verified).toBe(true);
    expect(body.plan).toBe("basic");
    expect(rpcCalls.length).toBe(1);
    expect(rpcCalls[0].p_reference).toBe(TX_REF);
    expect(rpcCalls[0].p_provider).toBe("flutterwave");
    expect(rpcCalls[0].p_amount_kobo).toBe(150000);
  });

  it("reports already_activated for a processed tx_ref without re-granting", async () => {
    givenRpc("apply_subscription_purchase", () => ({
      data: [{ applied: false, already_applied: true, paid_until: null }],
      error: null,
    }));
    const res = await handler(
      req("POST", "", { tx_ref: TX_REF }, { "x-forwarded-for": "10.20.0.6" }),
    );
    expect(res.status).toBe(200);
    const body = JSON.parse(await res.text());
    expect(body.verified).toBe(true);
    expect(body.already_activated).toBe(true);
  });

  it("rejects an amount that does not match the canonical price", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({ status: "success", data: flwTx({ amount: 10 }) }),
            { status: 200 },
          ),
      ),
    );
    const res = await handler(
      req("POST", "", { tx_ref: TX_REF }, { "x-forwarded-for": "10.20.0.7" }),
    );
    expect(res.status).toBe(200);
    const body = JSON.parse(await res.text());
    expect(body.verified).toBe(false);
    expect(rpcCalls.length).toBe(0);
  });

  it("rejects a failed transaction", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              status: "success",
              data: flwTx({ status: "failed" }),
            }),
            { status: 200 },
          ),
      ),
    );
    const res = await handler(
      req("POST", "", { tx_ref: TX_REF }, { "x-forwarded-for": "10.20.0.8" }),
    );
    const body = JSON.parse(await res.text());
    expect(body.verified).toBe(false);
    expect(rpcCalls.length).toBe(0);
  });
});

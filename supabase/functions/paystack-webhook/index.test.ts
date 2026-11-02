// Unit tests for paystack-webhook.
// Gates: HMAC-SHA512 signature (real Paystack scheme), signature
// rejection, and reference-idempotent subscription activation via
// the apply_subscription_purchase RPC (audit fix 2026-10-09).
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
const SECRET = "sk_test_wh";

async function hmacSha512Hex(body: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function payload(
  event = "charge.success",
  overrides: Record<string, unknown> = {},
) {
  return {
    event,
    data: {
      status: "success",
      amount: 150000,
      currency: "NGN",
      reference: "PS_ref_001",
      customer: { customer_code: "CUS_x" },
      metadata: {
        purpose: "subscription",
        plan: "basic",
        billing_cycle: "monthly",
        user_id: USER_ID,
      },
      ...overrides,
    },
  };
}

/** Build a Request carrying an EXACT raw body (signature must match it). */
function rawReq(raw: string, headers: Record<string, string>): Request {
  return new Request("https://test-project.supabase.co/functions/v1/fn", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: raw,
  });
}

let rpcCalls: Array<Record<string, unknown>> = [];

beforeEach(() => {
  resetCapture();
  state.env.PAYSTACK_SECRET_KEY = SECRET;
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

describe("paystack-webhook", () => {
  it("accepts a correctly signed charge.success and activates idempotently", async () => {
    const body = payload();
    const raw = JSON.stringify(body);
    const sig = await hmacSha512Hex(raw, SECRET);
    const res = await handler(
      rawReq(raw, {
        "x-paystack-signature": sig,
        "x-forwarded-for": "10.10.0.7",
      }),
    );
    expect(res.status).toBe(200);
    const out = JSON.parse(await res.text());
    expect(out.received).toBe(true);
    expect(out.activated).toBe(true);
    expect(rpcCalls.length).toBe(1);
    expect(rpcCalls[0].p_reference).toBe("PS_ref_001");
    expect(rpcCalls[0].p_days).toBe(30);
  });

  it("rejects a bad signature with 401 and never touches the ledger", async () => {
    const raw = JSON.stringify(payload());
    const res = await handler(
      rawReq(raw, {
        "x-paystack-signature": "deadbeef".repeat(8),
        "x-forwarded-for": "10.10.0.8",
      }),
    );
    expect(res.status).toBe(401);
    expect(rpcCalls.length).toBe(0);
  });

  it("reports already_activated when the reference was processed before", async () => {
    givenRpc("apply_subscription_purchase", () => ({
      data: [{ applied: false, already_applied: true, paid_until: null }],
      error: null,
    }));
    const raw = JSON.stringify(payload());
    const sig = await hmacSha512Hex(raw, SECRET);
    const res = await handler(
      rawReq(raw, {
        "x-paystack-signature": sig,
        "x-forwarded-for": "10.10.0.9",
      }),
    );
    expect(res.status).toBe(200);
    const out = JSON.parse(await res.text());
    expect(out.received).toBe(true);
    expect(out.already_activated).toBe(true);
  });

  it("acknowledges (does not 500) an amount that fails price validation", async () => {
    const body = payload("charge.success", { amount: 1000 });
    const raw = JSON.stringify(body);
    const sig = await hmacSha512Hex(raw, SECRET);
    const res = await handler(
      rawReq(raw, {
        "x-paystack-signature": sig,
        "x-forwarded-for": "10.10.0.10",
      }),
    );
    expect(res.status).toBe(200);
    const out = JSON.parse(await res.text());
    expect(out.received).toBe(true);
    expect(out.activated).toBe(false);
    expect(rpcCalls.length).toBe(0);
  });
});

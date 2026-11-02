import "./index.ts";
import {
  getHandler,
  givenRows,
  json,
  resetCapture,
  rpcStubs,
} from "../_shared/testing/harness.ts";
import { beforeEach, describe, expect, it, vi } from "vitest";

const handler = getHandler();
const API_KEY = "test-publisher-api-key";
const AD_SLOT_ID = "16";

async function signedQuery(values: Record<string, string>) {
  const params = new URLSearchParams(values);
  const sorted = new URLSearchParams(params);
  sorted.sort();
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(API_KEY),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const bytes = new Uint8Array(
    await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(sorted.toString()),
    ),
  );
  return {
    params,
    signature: [...bytes]
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join(""),
  };
}

function callbackRequest(params: URLSearchParams, signature: string) {
  return new Request(
    `https://test-project.supabase.co/functions/v1/ayet-rewarded-callback?${params.toString()}`,
    {
      method: "GET",
      headers: { "X-Ayetstudios-Security-Hash": signature },
    },
  );
}

beforeEach(() => {
  resetCapture();
  vi.stubGlobal("fetch", vi.fn());
  givenRows("ad_providers", [
    {
      slug: "ayet_studios",
      is_active: true,
      credentials: { api_key: API_KEY },
      settings: {
        rewarded_video_enabled: true,
        rewarded_adslot_id: AD_SLOT_ID,
      },
    },
  ]);
});

describe("ayeT rewarded callback", () => {
  it("requires a valid provider signature and passes the signed identifiers to the atomic grant RPC", async () => {
    const { params, signature } = await signedQuery({
      transaction_id: "tx-verified-001",
      external_identifier: "server-session-uuid-001",
      adslot_id: AD_SLOT_ID,
    });
    const rpc = vi.fn(() => ({
      data: [
        {
          success: true,
          new_balance: 15,
          credits_earned: 5,
          already_awarded: false,
          error: null,
        },
      ],
      error: null,
    }));
    rpcStubs.set("complete_ayet_rewarded_session", rpc);

    const response = await handler(callbackRequest(params, signature));
    const body = await json(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(rpc).toHaveBeenCalledWith(
      expect.objectContaining({
        p_external_identifier: "server-session-uuid-001",
        p_transaction_id: "tx-verified-001",
      }),
    );
  });

  it("never invokes the grant RPC for tampered, duplicate, or wrong-adslot callbacks", async () => {
    const { params, signature } = await signedQuery({
      transaction_id: "tx-verified-002",
      external_identifier: "server-session-uuid-002",
      adslot_id: AD_SLOT_ID,
    });
    const rpc = vi.fn(() => ({ data: null, error: null }));
    rpcStubs.set("complete_ayet_rewarded_session", rpc);

    const tampered = new URLSearchParams(params);
    tampered.set("transaction_id", "tx-forged");
    const badSignatureResponse = await handler(
      callbackRequest(tampered, signature),
    );
    expect(badSignatureResponse.status).toBe(200); // ayeT retries only non-200 postbacks; no grant is attempted
    expect(rpc).not.toHaveBeenCalled();

    const wrongSlot = new URLSearchParams(params);
    wrongSlot.set("adslot_id", "999");
    const wrongSlotSignature = await signedQuery({
      transaction_id: "tx-verified-002",
      external_identifier: "server-session-uuid-002",
      adslot_id: "999",
    });
    const wrongSlotResponse = await handler(
      callbackRequest(wrongSlot, wrongSlotSignature.signature),
    );
    expect(wrongSlotResponse.status).toBe(200);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns a retryable server error when the grant database call fails", async () => {
    const { params, signature } = await signedQuery({
      transaction_id: "tx-transient-001",
      external_identifier: "server-session-uuid-003",
      adslot_id: AD_SLOT_ID,
    });
    rpcStubs.set("complete_ayet_rewarded_session", () => ({
      data: null,
      error: { message: "database unavailable" },
    }));

    const response = await handler(callbackRequest(params, signature));
    expect(response.status).toBe(500);
  });
});

/**
 * rewarded-postback — S2S offerwall postback handler (multi-provider).
 *
 * Covers: provider routing + credential checks for the standard
 * offerwalls, the phased secret enforcement (sig param), and the
 * HMAC-verified Offerwall.ad flow (award / reversal / held events).
 */
import { describe, it, expect, beforeEach } from "vitest";
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

// Unique per-test rate-limit key: the handler rate-limits per user
// (x-user-id header), so each test gets a fresh bucket.
let reqNo = 0;
function get(
  path: string,
  headers: Record<string, string> = {},
): Promise<Response> {
  reqNo += 1;
  return handler(
    req("GET", path, undefined, {
      "x-user-id": `pb-test-${reqNo}`,
      ...headers,
    }),
  );
}

function hmacHex(payload: string, secret: string): Promise<string> {
  return crypto.subtle
    .importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    )
    .then((key) =>
      crypto.subtle.sign("HMAC", key, new TextEncoder().encode(payload)),
    )
    .then((buf) =>
      Array.from(new Uint8Array(buf))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join(""),
    );
}

/** Sign the query string (no leading '?') — the candidate the
 * Offerwall.ad verification loop accepts for GET deliveries. */
async function signedOfferwallGet(
  params: string,
  headers: Record<string, string> = {},
): Promise<Response> {
  state.env.OFFERWALL_AD_SIGNING_SECRET = "test-signing-secret";
  const sig = await hmacHex(params, "test-signing-secret");
  return get(`/offerwall_ad?${params}`, {
    "X-Offerwall-Ad-Signature": `sha256=${sig}`,
    ...headers,
  });
}

beforeEach(() => {
  delete state.env.OFFERWALL_AD_SIGNING_SECRET;
  delete state.env.OFFERWALL_AD_SHARED_PASSWORD;
});

describe("standard offerwall postbacks (AdGate Media)", () => {
  function givenAdgate(creds: Record<string, unknown>) {
    givenRows("ad_providers", [
      {
        id: "p-adgate",
        slug: "adgate_media",
        name: "AdGate Media",
        is_active: true,
        credentials: creds,
      },
    ]);
  }

  it("grants an unlock for a valid postback", async () => {
    givenAdgate({ gateway_id: "GATE123" });
    const res = await get(
      "/adgate_media?user_id=ch_user1&credits=10&gateway_id=GATE123",
    );
    expect(res.status).toBe(200);
    expect((await json(res)).success).toBe(true);
    // The unlock landed for the default tool with the provider name
    const log = tableFixtures.get("rewarded_unlock_log") ?? [];
    expect(log.length).toBeGreaterThan(0);
    expect(log[log.length - 1].client_hash).toBe("ch_user1");
    expect(log[log.length - 1].ad_provider).toBe("AdGate Media");
  });

  it("honours the tool_key param on the unlock", async () => {
    givenAdgate({ gateway_id: "GATE123" });
    const res = await get(
      "/adgate_media?user_id=ch_user2&credits=10&gateway_id=GATE123&tool_key=finish_estimator",
    );
    expect(res.status).toBe(200);
    const log = tableFixtures.get("rewarded_unlock_log") ?? [];
    expect(log[log.length - 1].tool_key).toBe("finish_estimator");
  });

  it("rejects a mismatched gateway id with 403", async () => {
    givenAdgate({ gateway_id: "GATE123" });
    const res = await get(
      "/adgate_media?user_id=ch_user3&credits=10&gateway_id=FORGED",
    );
    expect(res.status).toBe(403);
    expect((await json(res)).error).toContain("credential mismatch");
  });

  it("rejects postbacks for an unknown provider with 400", async () => {
    const res = await get("/bogus_network?user_id=x&amount=1");
    expect(res.status).toBe(400);
    expect((await json(res)).error).toBe("Unknown provider");
  });

  it("rejects a valid-credential postback without a user id", async () => {
    givenAdgate({ gateway_id: "GATE123" });
    const res = await get("/adgate_media?credits=10&gateway_id=GATE123");
    expect(res.status).toBe(400);
    expect((await json(res)).error).toContain("user identifier");
  });

  it("rejects postbacks when the provider is not active in the DB", async () => {
    givenRows("ad_providers", [
      { id: "p-off", slug: "adgate_media", is_active: false, credentials: {} },
    ]);
    const res = await get(
      "/adgate_media?user_id=ch_user4&credits=10&gateway_id=GATE123",
    );
    expect(res.status).toBe(403);
  });
});

describe("phased postback-secret enforcement", () => {
  it("accepts a postback without a secret but logs secret_missing", async () => {
    givenRows("ad_providers", [
      {
        id: "p-toro",
        slug: "offertoro",
        name: "OfferToro",
        is_active: true,
        credentials: { app_id: "APP9" },
      },
    ]);
    const res = await get(
      "/offertoro?user_id=ch_user5&amount=25&app_id=APP9&pub=TESTPUB",
    );
    expect(res.status).toBe(200);
    const events = tableFixtures.get("ad_analytics_events") ?? [];
    const missing = events.find(
      (e: any) => e.event_type === "postback_secret_missing",
    );
    expect(missing).toBeTruthy();
  });

  it("rejects a postback when a stored secret is not provided", async () => {
    givenRows("ad_providers", [
      {
        id: "p-toro",
        slug: "offertoro",
        is_active: true,
        credentials: { app_id: "APP9", secret: "s3cret" },
      },
    ]);
    const res = await get(
      "/offertoro?user_id=ch_user6&amount=25&app_id=APP9&pub=TESTPUB",
    );
    expect(res.status).toBe(403);
    const events = tableFixtures.get("ad_analytics_events") ?? [];
    expect(
      events.some((e: any) => e.event_type === "postback_secret_mismatch"),
    ).toBe(true);
  });

  it("accepts the postback when &sig matches the stored secret", async () => {
    givenRows("ad_providers", [
      {
        id: "p-toro",
        slug: "offertoro",
        is_active: true,
        credentials: { app_id: "APP9", secret: "s3cret" },
      },
    ]);
    const res = await get(
      "/offertoro?user_id=ch_user7&amount=25&app_id=APP9&pub=TESTPUB&sig=s3cret",
    );
    expect(res.status).toBe(200);
    expect((await json(res)).success).toBe(true);
  });

  it("falls back to integration_settings for the stored secret", async () => {
    givenRows("ad_providers", [
      {
        id: "p-toro",
        slug: "offertoro",
        is_active: true,
        credentials: { app_id: "APP9" },
      },
    ]);
    givenRows("integration_settings", [
      { integration_key: "offertoro", config: { secret: "int-secret" } },
    ]);
    const res = await get(
      "/offertoro?user_id=ch_user8&amount=25&app_id=APP9&pub=TESTPUB&sig=int-secret",
    );
    expect(res.status).toBe(200);
  });

  it("routes a postback by the ?pub param even without a slug path", async () => {
    givenRows("ad_providers", [
      {
        id: "p-toro",
        slug: "offertoro",
        is_active: true,
        credentials: { app_id: "APP9" },
      },
    ]);
    const res = await get(
      "?user_id=ch_user9&amount=25&app_id=APP9&pub=TESTPUB",
    );
    expect(res.status).toBe(200);
    const log = tableFixtures.get("rewarded_unlock_log") ?? [];
    expect(log[log.length - 1].ad_provider).toBe("OfferToro");
  });
});

describe("Offerwall.ad — HMAC-verified conversions", () => {
  it("awards credits on a validly signed conversion", async () => {
    let captured: any = null;
    givenRpc("award_offerwall_credits", (args: any) => {
      captured = args;
      return { data: [{ success: true, new_balance: 42 }], error: null };
    });
    const res = await signedOfferwallGet("uid=u-abc&amount=5&tx_id=tx-100");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.success).toBe(true);
    expect(body.credits).toBe(5);
    expect(body.new_balance).toBe(42);
    expect(captured.p_user_id).toBe("u-abc");
    expect(captured.p_amount).toBe(5);
    expect(captured.p_event_id).toBe("tx-100");
  });

  it("is idempotent when the conversion was already awarded", async () => {
    givenRpc("award_offerwall_credits", () => ({
      data: [{ success: false, error: "already_awarded" }],
      error: null,
    }));
    const res = await signedOfferwallGet("uid=u-abc&amount=5&tx_id=tx-101");
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.already_awarded).toBe(true);
  });

  it("processes a signed reversal by deducting credits", async () => {
    let captured: any = null;
    givenRpc("reverse_offerwall_credits", (args: any) => {
      captured = args;
      return { data: [{ success: true, new_balance: 37 }], error: null };
    });
    const res = await signedOfferwallGet("uid=u-abc&amount=5&tx_id=tx-102", {
      "X-Offerwall-Ad-Event": "conversion.reversed",
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.credits_reversed).toBe(5);
    expect(body.new_balance).toBe(37);
    expect(captured.p_original_tx_id).toBe("tx-102");
  });

  it("treats a repeat reversal as already processed", async () => {
    givenRpc("reverse_offerwall_credits", () => ({
      data: [{ success: false }],
      error: null,
    }));
    const res = await signedOfferwallGet("uid=u-abc&amount=5&tx_id=tx-103", {
      "X-Offerwall-Ad-Event": "conversion.reversed",
    });
    expect(res.status).toBe(200);
    expect((await json(res)).already_reversed).toBe(true);
  });

  it("acknowledges held/rejected events without awarding", async () => {
    let called = false;
    givenRpc("award_offerwall_credits", () => {
      called = true;
      return { data: [{ success: true }], error: null };
    });
    const res = await signedOfferwallGet("uid=u-abc&amount=5&tx_id=tx-104", {
      "X-Offerwall-Ad-Event": "conversion.held",
    });
    expect(res.status).toBe(200);
    expect((await json(res)).success).toBe(true);
    expect(called).toBe(false);
  });

  it("rejects a tampered signature with 403 and logs debug info", async () => {
    state.env.OFFERWALL_AD_SIGNING_SECRET = "test-signing-secret";
    const res = await get("/offerwall_ad?uid=u-abc&amount=5&tx_id=tx-105", {
      "X-Offerwall-Ad-Signature": "sha256=" + "0".repeat(64),
    });
    expect(res.status).toBe(403);
    expect((await json(res)).error).toContain("signature");
    const events = tableFixtures.get("ad_analytics_events") ?? [];
    expect(events.some((e: any) => e.event_type === "sig_debug")).toBe(true);
  });

  it("rejects a missing signature header with 401", async () => {
    state.env.OFFERWALL_AD_SIGNING_SECRET = "test-signing-secret";
    const res = await get("/offerwall_ad?uid=u-abc&amount=5&tx_id=tx-106");
    expect(res.status).toBe(401);
  });

  it("requires uid and a positive amount before anything else", async () => {
    const noUid = await get("/offerwall_ad?amount=5&tx_id=tx-107");
    expect(noUid.status).toBe(400);
    const badAmount = await get(
      "/offerwall_ad?uid=u-abc&amount=abc&tx_id=tx-108",
    );
    expect(badAmount.status).toBe(400);
    const zeroAmount = await get(
      "/offerwall_ad?uid=u-abc&amount=0&tx_id=tx-109",
    );
    expect(zeroAmount.status).toBe(400);
  });

  it("requires a transaction or event id", async () => {
    const res = await get("/offerwall_ad?uid=u-abc&amount=5");
    expect(res.status).toBe(400);
  });

  it("enforces the shared password when configured", async () => {
    state.env.OFFERWALL_AD_SHARED_PASSWORD = "pw-123";
    const res = await signedOfferwallGet("uid=u-abc&amount=5&tx_id=tx-110");
    expect(res.status).toBe(403);
    expect((await json(res)).error).toContain("credentials");
  });
});

// Unit tests for workflow-push.
// Gates: 405 method honesty, 400 validation, 401 caller auth,
// owner-only document access, subscriptions required, honest
// no-op without VAPID keys, real encrypted delivery (aes128gcm
// body + vapid Authorization to the RIGHT endpoint), dead
// endpoint pruning (log row 'failed'), transient failure
// releases the claim (retry stays possible).
// At-most-once per (event, browser) is enforced in production by
// the workflow_push_log unique(event_id, subscription_id) index
// — the table mock cannot express insert conflicts.
import "./index.ts";
import {
  getHandler,
  givenRows,
  givenUser,
  req,
  json,
  resetCapture,
  state,
  tableFixtures,
} from "../_shared/testing/harness.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const handler = getHandler();

const OWNER = "11111111-1111-4111-8111-111111111111";
const DOC_ID = "22222222-2222-4222-8222-222222222222";
const EVENT_LATEST = "44444444-4444-4444-8444-444444444444";
const PROJECT = {
  id: "55555555-5555-4555-8555-555555555555",
  name: "Lekki Tower Fitout",
  user_id: OWNER,
};
const DOC = {
  id: DOC_ID,
  doc_type: "rfi",
  reference_code: "RFI-0001",
  title: "Ceiling void clearance at level 3",
  status: "answered",
  project: PROJECT,
};
// RFC 8291 §5 user-agent keys — a valid 65-byte P-256 point and
// auth secret, so encryptPayload succeeds in tests.
const SUB_KEYS = {
  p256dh:
    "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  auth: "BTBZMqHH6r4Tts7J_aSIgg",
};
const SUB_ID = "66666666-6666-4666-8666-666666666666";
const SUB = {
  id: SUB_ID,
  endpoint: "https://push.example.net/push/JzLQ3raZJfFBR0aqvOMsLrt54w4rJUsV",
  p256dh: SUB_KEYS.p256dh,
  auth: SUB_KEYS.auth,
  user_id: OWNER,
};

let pushCalls: Array<{
  url: string;
  headers: Record<string, string>;
  body: Uint8Array;
}>;
let endpointStatus = 201;
let vapid: { pub: string; priv: string };

let ipSeq = 0;
function freshReq(method: string, body: unknown, token = "tok") {
  ipSeq += 1;
  return req(method, "", body, {
    "x-forwarded-for": `10.0.2.${ipSeq}`,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });
}

function seedAll(withSub = true) {
  givenUser({ id: OWNER, email: "owner@example.com" });
  givenRows("workflow_documents", [{ ...DOC, project: { ...PROJECT } }]);
  givenRows("workflow_events", [
    {
      id: "33333333-3333-4333-8333-333333333333",
      document_id: DOC_ID,
      event_type: "transition",
      from_status: "open",
      to_status: "answered",
      actor: "owner",
      note: "answered per drawing A-301",
      created_at: "2026-10-14T11:00:00Z",
    },
    {
      id: EVENT_LATEST,
      document_id: DOC_ID,
      event_type: "transition",
      from_status: "answered",
      to_status: "closed",
      actor: "owner",
      note: null,
      created_at: "2026-10-14T12:00:00Z",
    },
  ]);
  givenRows("workflow_push_subscriptions", withSub ? [{ ...SUB }] : []);
}

beforeEach(async () => {
  resetCapture();
  state.env.SUPABASE_URL = "https://test-project.supabase.co";
  state.env.SUPABASE_SERVICE_ROLE_KEY = "svc-test";
  // Valid VAPID pair (P-256) for the sign path.
  const pair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"],
  );
  const jwk = await crypto.subtle.exportKey("jwk", pair.privateKey);
  const pubRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", pair.publicKey),
  );
  const b64u = (b: Uint8Array) =>
    btoa(String.fromCharCode(...b))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
  vapid = { pub: b64u(pubRaw), priv: jwk.d as string };
  state.env.VAPID_PUBLIC_KEY = vapid.pub;
  state.env.VAPID_PRIVATE_KEY = vapid.priv;
  pushCalls = [];
  endpointStatus = 201;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const url_s = String(url);
      if (url_s.includes("push.example.net")) {
        pushCalls.push({
          url: url_s,
          headers: (init?.headers ?? {}) as Record<string, string>,
          body: new Uint8Array(
            (init?.body as unknown as ArrayBufferLike) ?? new ArrayBuffer(0),
          ),
        });
        return new Response("", { status: endpointStatus });
      }
      // Supabase REST (integration_secrets lookups): serve any
      // seeded fixtures, honoring the provider_id query filter
      // the same way PostgREST would.
      if (url_s.includes("integration_secrets")) {
        const match = url_s.match(/provider_id=eq\.([a-z-]+)/);
        const wanted = match?.[1];
        const rows = (tableFixtures.get("integration_secrets") ?? [])
          .filter((r) => !wanted || r.provider_id === wanted)
          .map((r) => ({ key_value: r.key_value }));
        return new Response(JSON.stringify(rows), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response("{}", { status: 404 });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("workflow-push", () => {
  it("does not accept GET (405 method honesty)", async () => {
    const res = await handler(freshReq("GET", undefined));
    expect(res.status).toBe(405);
  });

  it("rejects a missing or malformed document_id with 400", async () => {
    seedAll();
    expect((await handler(freshReq("POST", {}))).status).toBe(400);
    expect(
      (await handler(freshReq("POST", { document_id: "nope" }))).status,
    ).toBe(400);
  });

  it("rejects callers without a bearer token (401)", async () => {
    seedAll();
    const res = await handler(freshReq("POST", { document_id: DOC_ID }, ""));
    expect(res.status).toBe(401);
    expect(pushCalls.length).toBe(0);
  });

  it("does not push for a project the caller does not own", async () => {
    const otherId = "77777777-7777-4777-8777-777777777777";
    givenUser({ id: otherId, email: "other@example.com" });
    givenRows("workflow_documents", [{ ...DOC, project: { ...PROJECT } }]);
    givenRows("workflow_push_subscriptions", [{ ...SUB }]);
    const res = await handler(freshReq("POST", { document_id: DOC_ID }));
    expect(res.status).toBe(404);
    expect(pushCalls.length).toBe(0);
  });

  it("is an honest no-op when the owner has no subscriptions", async () => {
    seedAll(false);
    const res = await handler(freshReq("POST", { document_id: DOC_ID }));
    expect(res.status).toBe(200);
    expect((await json(res)).reason).toBe("no subscriptions");
    expect(pushCalls.length).toBe(0);
  });

  it("is a silent no-op with NO ledger rows when no VAPID keys are configured", async () => {
    seedAll();
    state.env.VAPID_PUBLIC_KEY = "";
    state.env.VAPID_PRIVATE_KEY = "";
    const res = await handler(freshReq("POST", { document_id: DOC_ID }));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.sent).toBe(false);
    expect(body.reason).toBe("not configured");
    expect(pushCalls.length).toBe(0);
    expect((tableFixtures.get("workflow_push_log") ?? []).length).toBe(0);
  });

  it("delivers one encrypted push to the subscribed browser and logs it", async () => {
    seedAll();
    const res = await handler(freshReq("POST", { document_id: DOC_ID }));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.sent).toBe(true);
    expect(body.count).toBe(1);

    expect(pushCalls.length).toBe(1);
    const call = pushCalls[0];
    expect(call.url).toBe(SUB.endpoint);
    expect(call.headers["Content-Encoding"]).toBe("aes128gcm");
    expect(call.headers.Authorization.startsWith("vapid t=eyJ")).toBe(true);
    expect(call.headers.Authorization).toContain(`k=${vapid.pub}`);
    // Body: salt(16)+rs(4)+idlen(1)+65-byte key + GCM tag -> encrypted.
    expect(call.body.length).toBeGreaterThan(86);
    expect(call.body[20]).toBe(65);

    // At-most-once ledger for the LATEST event.
    const log = tableFixtures.get("workflow_push_log") ?? [];
    expect(log.length).toBe(1);
    expect(log[0].event_id).toBe(EVENT_LATEST);
    expect(log[0].subscription_id).toBe(SUB_ID);
    expect(log[0].status).toBe("sent");
  });

  it("prefers DB-pasted VAPID keys over shape-mismatched env values", async () => {
    seedAll();
    // A SECOND valid pair lives in the DB (Integration Center).
    const dbPair = await crypto.subtle.generateKey(
      { name: "ECDSA", namedCurve: "P-256" },
      true,
      ["sign", "verify"],
    );
    const dbJwk = await crypto.subtle.exportKey("jwk", dbPair.privateKey);
    const dbPub = btoa(
      String.fromCharCode(
        ...new Uint8Array(
          await crypto.subtle.exportKey("raw", dbPair.publicKey),
        ),
      ),
    )
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    givenRows("integration_secrets", [
      { provider_id: "web-push-public", key_value: dbPub, status: "active" },
      {
        provider_id: "web-push-private",
        key_value: dbJwk.d as string,
        status: "active",
      },
    ]);
    // The env holds the OLD raw-hex values: not a valid P-256
    // pair and must NEVER override the DB.
    state.env.VAPID_PUBLIC_KEY =
      "7d639b81d93d288a63ec36a677d89eebd39fd38bbeb0b0270516edef1f98cd4b";
    state.env.VAPID_PRIVATE_KEY =
      "5f6cc390e70e4b09b1c60f8bea2d4c9c2a6f0e5b7d3a4c1e8f9a0b2c3d4e5f60";
    const res = await handler(freshReq("POST", { document_id: DOC_ID }));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.sent).toBe(true);
    // Delivery signed with the DB pair, NOT the env hex.
    expect(pushCalls[0].headers.Authorization).toContain(`k=${dbPub}`);
    expect(pushCalls[0].headers.Authorization).not.toContain("7d639b81");
  });

  it("rejects shape-mismatched env hex and reports not configured when no DB keys exist", async () => {
    seedAll();
    state.env.VAPID_PUBLIC_KEY =
      "7d639b81d93d288a63ec36a677d89eebd39fd38bbeb0b0270516edef1f98cd4b";
    state.env.VAPID_PRIVATE_KEY =
      "5f6cc390e70e4b09b1c60f8bea2d4c9c2a6f0e5b7d3a4c1e8f9a0b2c3d4e5f60";
    const res = await handler(freshReq("POST", { document_id: DOC_ID }));
    expect(res.status).toBe(200);
    expect((await json(res)).reason).toBe("not configured");
    expect(pushCalls.length).toBe(0);
  });

  it("prunes a dead endpoint (410) and keeps an honest failed log row", async () => {
    seedAll();
    endpointStatus = 410;
    const res = await handler(freshReq("POST", { document_id: DOC_ID }));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.sent).toBe(false);
    expect(body.pruned).toBe(1);
    const log = tableFixtures.get("workflow_push_log") ?? [];
    expect(log.length).toBe(1);
    expect(log[0].status).toBe("failed");
    expect(String(log[0].detail)).toContain("410");
  });

  it("releases the claim on transient failures so retries stay possible", async () => {
    seedAll();
    endpointStatus = 503;
    const res = await handler(freshReq("POST", { document_id: DOC_ID }));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.sent).toBe(false);
    expect(body.failed).toBe(1);
    // The mock delete is a no-op, but the response must report
    // the honest failure (the DB unique index still holds).
    expect(pushCalls.length).toBe(1);
  });
});

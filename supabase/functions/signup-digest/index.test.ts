// Unit tests for signup-digest.
// Gates: 401 without (or with a wrong) token, 405 method honesty,
// email heartbeat (zero news included), SMS only when there is
// news, Nigerian phone formatting.
import "./index.ts";
import {
  getHandler,
  givenRows,
  req,
  json,
  resetCapture,
  state,
} from "../_shared/testing/harness.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const handler = getHandler();

const DIGEST_TOKEN = "digest-token-1";

const CUTOFF = new Date(Date.now() - 60 * 60 * 1000).toISOString();
const OLD = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();

const PROFILES = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    email: "new1@example.com",
    account_type: "client",
    created_at: CUTOFF,
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    email: "new2@example.com",
    account_type: "pro_worker",
    created_at: CUTOFF,
  },
  {
    id: "33333333-3333-3333-3333-333333333333",
    email: "old@example.com",
    account_type: "client",
    created_at: OLD,
  },
];

interface Call {
  url: string;
  body: any;
}
let calls: Call[];

beforeEach(() => {
  resetCapture();
  givenRows("signup_digest_tokens", [{ token: DIGEST_TOKEN }]);
  givenRows(
    "profiles",
    PROFILES.map((p) => ({ ...p })),
  );
  state.env.RESEND_API_KEY = "re_test";
  state.env.OWNER_NOTIFY_EMAIL = "owner@example.com";
  state.env.OWNER_NOTIFY_PHONE = "";
  state.env.TERMII_API_KEY = "";
  calls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      const url_s = String(url);
      calls.push({
        url: url_s,
        body: init?.body ? JSON.parse(String(init?.body)) : null,
      });
      return new Response("{}", { status: 200 });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

function authReq(body: unknown = {}) {
  return req("POST", "", body, { "x-digest-token": DIGEST_TOKEN });
}

describe("signup-digest", () => {
  it("does not accept GET (405 method honesty)", async () => {
    const res = await handler(
      req("GET", "", undefined, { "x-digest-token": DIGEST_TOKEN }),
    );
    expect(res.status).toBe(405);
  });

  it("rejects callers without the token (401)", async () => {
    const res = await handler(req("POST", "", {}));
    expect(res.status).toBe(401);
  });

  it("rejects a wrong token (401)", async () => {
    const res = await handler(
      req("POST", "", {}, { "x-digest-token": "nope" }),
    );
    expect(res.status).toBe(401);
  });

  it("emails the owner the last-24h signups with totals", async () => {
    const res = await handler(authReq());
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.new_users).toBe(2);
    expect(body.email_sent).toBe(true);
    const email = calls.find((c) => c.url.includes("api.resend.com"));
    expect(email).toBeTruthy();
    expect(email!.body.to).toEqual(["owner@example.com"]);
    expect(email!.body.subject).toBe("Frelux daily digest: 2 new signups");
    // Only the recent 24h users, not the 48h-old one.
    expect(email!.body.html).toContain("new1@example.com");
    expect(email!.body.html).toContain("new2@example.com");
    expect(email!.body.html).not.toContain("old@example.com");
    // No SMS configured: none sent.
    expect(body.sms_sent).toBe(false);
  });

  it("sends the heartbeat email even with zero new signups", async () => {
    givenRows("profiles", [{ ...PROFILES[2] }]); // only the old one
    const res = await handler(authReq());
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.new_users).toBe(0);
    expect(body.email_sent).toBe(true);
    const email = calls.find((c) => c.url.includes("api.resend.com"));
    expect(email!.body.subject).toBe("Frelux daily digest: no new signups");
  });

  it("sends an SMS via Termii (234-formatted) only when there is news", async () => {
    state.env.OWNER_NOTIFY_PHONE = "0803 123 4567";
    state.env.TERMII_API_KEY = "termii_key";
    const res = await handler(authReq());
    const body = await json(res);
    expect(body.sms_sent).toBe(true);
    const sms = calls.find((c) => c.url.includes("api.ng.termii.com"));
    expect(sms).toBeTruthy();
    expect(sms!.body.to).toBe("2348031234567");
    expect(sms!.body.sms).toContain("2 new users");
    // Fixed sender default.
    expect(sms!.body.from).toBe("FRELUX");

    // Zero-news day: no SMS at all.
    givenRows("profiles", [{ ...PROFILES[2] }]);
    calls = [];
    await handler(authReq());
    expect(
      calls.find((c) => c.url.includes("api.ng.termii.com")),
    ).toBeUndefined();
  });

  it("skips the email silently when no owner inbox is configured", async () => {
    state.env.OWNER_NOTIFY_EMAIL = "";
    state.env.CONTACT_NOTIFY_EMAIL = "";
    const res = await handler(authReq());
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.new_users).toBe(2);
    expect(body.email_sent).toBe(false);
    expect(calls.find((c) => c.url.includes("api.resend.com"))).toBeUndefined();
  });

  it("rejects with 401 when the token table is empty (migration not applied)", async () => {
    givenRows("signup_digest_tokens", []);
    const res = await handler(authReq());
    expect(res.status).toBe(401);
  });
});

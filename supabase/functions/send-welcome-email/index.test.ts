// Unit tests for send-welcome-email.
// Gates: 405 method honesty, 400 validation, at-most-once flag,
// recipient derived server-side, best-effort no-key path.
import "./index.ts";
import {
  getHandler,
  givenRows,
  req,
  json,
  resetCapture,
  state,
  tableFixtures,
} from "../_shared/testing/harness.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const handler = getHandler();

const PROFILE = {
  id: "11111111-1111-1111-1111-111111111111",
  email: "newbie@example.com",
  full_name: null,
  account_type: "client",
  welcome_email_sent: false,
};

// Captured Resend calls (global fetch is stubbed per test).
let resendCalls: Array<{ auth: string; body: any }>;

let ipSeq = 0;

/** Unique IP per call so the 5/min rate limit never trips between tests. */
function freshReq(method: string, body: unknown) {
  ipSeq += 1;
  return req(method, "", body, { "x-forwarded-for": `10.0.0.${ipSeq}` });
}

beforeEach(() => {
  resetCapture();
  // Deno.env.get reads this map (see harness installDeno).
  state.env.RESEND_API_KEY = "re_test";
  resendCalls = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      if (String(url).includes("api.resend.com")) {
        resendCalls.push({
          auth: String(
            (init?.headers as Record<string, string>)?.Authorization ?? "",
          ),
          body: JSON.parse(String(init?.body)),
        });
        return new Response("{}", { status: 200 });
      }
      return new Response("{}", { status: 404 });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("send-welcome-email", () => {
  it("does not accept GET (405 method honesty)", async () => {
    const res = await handler(freshReq("GET", undefined));
    expect(res.status).toBe(405);
  });

  it("rejects a missing or malformed user_id with 400", async () => {
    const res = await handler(freshReq("POST", {}));
    expect(res.status).toBe(400);
    const res2 = await handler(freshReq("POST", { user_id: "not-a-uuid" }));
    expect(res2.status).toBe(400);
  });

  it("sends the welcome email to the profile's stored address and sets the flag", async () => {
    givenRows("profiles", [{ ...PROFILE }]);
    const res = await handler(freshReq("POST", { user_id: PROFILE.id }));
    expect(res.status).toBe(200);
    expect((await json(res)).sent).toBe(true);
    // Recipient derived from the profiles row, not the request body.
    expect(resendCalls.length).toBe(1);
    expect(resendCalls[0].body.to).toEqual([PROFILE.email]);
    expect(resendCalls[0].body.subject).toBe("Welcome to Frelux");
    expect(resendCalls[0].body.html).toContain(PROFILE.email);
    // No em dashes in the email copy (standing owner rule).
    expect(resendCalls[0].body.html.includes("\u2014")).toBe(false);
    // Flag set after the send (fixtures mutate in place).
    expect(tableFixtures.get("profiles")?.[0]?.welcome_email_sent).toBe(true);
  });

  it("is at-most-once: a second call for the same user is a no-op", async () => {
    givenRows("profiles", [{ ...PROFILE, welcome_email_sent: true }]);
    const res = await handler(freshReq("POST", { user_id: PROFILE.id }));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.sent).toBe(false);
    expect(body.reason).toBe("already sent");
    expect(resendCalls.length).toBe(0);
  });

  it("returns sent:false without error when the profile is missing", async () => {
    const res = await handler(
      req("POST", "", { user_id: "99999999-9999-9999-9999-999999999999" }),
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.sent).toBe(false);
    expect(body.reason).toBe("no profile");
  });

  it("fails gracefully (200, sent:false) when RESEND_API_KEY is unset", async () => {
    state.env.RESEND_API_KEY = "";
    const res = await handler(freshReq("POST", { user_id: PROFILE.id }));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.sent).toBe(false);
    expect(body.reason).toBe("not configured");
    expect(resendCalls.length).toBe(0);
  });
});

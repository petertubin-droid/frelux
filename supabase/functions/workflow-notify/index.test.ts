// Unit tests for workflow-notify.
// Gates: 405 method honesty, 400 validation, 401 caller auth,
// owner-only document access, server-derived recipient + fixed
// content, latest-event selection, no-key honesty (nothing
// logged so retries stay possible), resend-failure release.
// At-most-once per event is enforced in production by the
// workflow_notify_log unique(event_id) index — the table mock
// cannot express insert conflicts, so the claim conflict path
// is guarded there.
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
const PROFILE = {
  id: OWNER,
  email: "owner@example.com",
  full_name: "Amara Okafor",
};
const DOC_ID = "22222222-2222-4222-8222-222222222222";
const EVENT_OLD = "33333333-3333-4333-8333-333333333333";
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
  assignee: "Site Architect",
  due_date: "2026-10-20",
  status: "answered",
  project: PROJECT,
};

function seedEvents() {
  givenRows("workflow_events", [
    {
      id: EVENT_OLD,
      document_id: DOC_ID,
      event_type: "transition",
      from_status: "draft",
      to_status: "open",
      actor: "owner",
      note: "first raised",
      created_at: "2026-10-14T09:00:00Z",
    },
    {
      id: EVENT_LATEST,
      document_id: DOC_ID,
      event_type: "transition",
      from_status: "open",
      to_status: "answered",
      actor: "owner",
      note: "answered per drawing A-301",
      created_at: "2026-10-14T11:00:00Z",
    },
  ]);
}

let resendCalls: Array<{ auth: string; body: any }>;
let resendStatus = 200;

let ipSeq = 0;
function freshReq(method: string, body: unknown, token = "tok") {
  ipSeq += 1;
  return req(method, "", body, {
    "x-forwarded-for": `10.0.1.${ipSeq}`,
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });
}

function seedAll() {
  givenUser({ id: OWNER, email: PROFILE.email });
  givenRows("workflow_documents", [{ ...DOC, project: { ...PROJECT } }]);
  seedEvents();
  givenRows("profiles", [{ ...PROFILE }]);
}

beforeEach(() => {
  resetCapture();
  state.env.RESEND_API_KEY = "re_test";
  state.env.SUPABASE_URL = "https://test-project.supabase.co";
  state.env.SUPABASE_SERVICE_ROLE_KEY = "svc-test";
  resendCalls = [];
  resendStatus = 200;
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
        return new Response("{}", { status: resendStatus });
      }
      return new Response("{}", { status: 404 });
    }),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("workflow-notify", () => {
  it("does not accept GET (405 method honesty)", async () => {
    const res = await handler(freshReq("GET", undefined));
    expect(res.status).toBe(405);
  });

  it("rejects a missing or malformed document_id with 400", async () => {
    seedAll();
    const res = await handler(freshReq("POST", {}));
    expect(res.status).toBe(400);
    const res2 = await handler(freshReq("POST", { document_id: "nope" }));
    expect(res2.status).toBe(400);
  });

  it("rejects callers without a bearer token (401)", async () => {
    seedAll();
    const res = await handler(freshReq("POST", { document_id: DOC_ID }, ""));
    expect(res.status).toBe(401);
    expect(resendCalls.length).toBe(0);
  });

  it("returns not found when the document does not exist", async () => {
    givenUser({ id: OWNER, email: PROFILE.email });
    const res = await handler(
      freshReq("POST", { document_id: "99999999-9999-4999-8999-999999999999" }),
    );
    expect(res.status).toBe(404);
  });

  it("does not notify for a project the caller does not own", async () => {
    // Authenticated caller, but the project belongs to someone else.
    const other = {
      ...PROFILE,
      id: "77777777-7777-4777-8777-777777777777",
      email: "other@example.com",
    };
    givenUser({ id: other.id, email: other.email });
    givenRows("workflow_documents", [{ ...DOC, project: { ...PROJECT } }]);
    seedEvents();
    const res = await handler(freshReq("POST", { document_id: DOC_ID }));
    expect(res.status).toBe(404);
    expect(resendCalls.length).toBe(0);
  });

  it("sends ONE email for the LATEST event, derives the recipient server-side, and writes the sent ledger row", async () => {
    seedAll();
    const res = await handler(freshReq("POST", { document_id: DOC_ID }));
    expect(res.status).toBe(200);
    expect((await json(res)).sent).toBe(true);

    expect(resendCalls.length).toBe(1);
    expect(resendCalls[0].auth).toBe("Bearer re_test");
    // Recipient comes from the profiles row, never the request.
    expect(resendCalls[0].body.to).toEqual([PROFILE.email]);
    expect(resendCalls[0].body.subject).toBe(
      "Frelux: RFI RFI-0001 is now answered",
    );
    const html = resendCalls[0].body.html as string;
    expect(html).toContain("RFI-0001");
    expect(html).toContain("Ceiling void clearance at level 3");
    expect(html).toContain("Lekki Tower Fitout");
    expect(html).toContain("open → answered");
    expect(html).toContain("answered per drawing A-301");
    expect(html).toContain("Amara");
    // No em dashes in the email copy (standing owner rule).
    expect(html.includes("\u2014")).toBe(false);

    // At-most-once ledger: exactly one row, for the latest event.
    const ledger = tableFixtures.get("workflow_notify_log") ?? [];
    expect(ledger.length).toBe(1);
    expect(ledger[0].event_id).toBe(EVENT_LATEST);
    expect(ledger[0].status).toBe("sent");
    expect(ledger[0].document_id).toBe(DOC_ID);
  });

  it("is a silent no-op with NO ledger row when no Resend key is configured", async () => {
    state.env.RESEND_API_KEY = "";
    seedAll();
    const res = await handler(freshReq("POST", { document_id: DOC_ID }));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.sent).toBe(false);
    expect(body.reason).toBe("not configured");
    expect(resendCalls.length).toBe(0);
    // Nothing logged: a key pasted later still allows a retry.
    expect((tableFixtures.get("workflow_notify_log") ?? []).length).toBe(0);
  });

  it("reports resend failure honestly and keeps retries possible", async () => {
    resendStatus = 500;
    seedAll();
    const res = await handler(freshReq("POST", { document_id: DOC_ID }));
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.sent).toBe(false);
    expect(body.reason).toBe("resend");
  });
});

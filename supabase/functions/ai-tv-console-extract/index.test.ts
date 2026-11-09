// Unit tests for ai-tv-console-extract.
//
// This function is the only path that turns a photo into TV-console
// dimensions, so the gates matter more than the happy path: a missing key must
// say so instead of crashing, an unauthenticated call must never reach the
// vision provider, and a paywall refusal must not happen after the model has
// already been billed.
import "./index.ts";
import {
  getHandler,
  givenRows,
  givenUser,
  installDeno,
  json,
  req,
  resetCapture,
  OWNER_AUTH,
  OWNER_ID,
} from "../_shared/testing/harness.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const handler = getHandler();

const IMAGE = "data:image/jpeg;base64,MTIzNDU2Nzg=";

const BASE_ENV = {
  SUPABASE_URL: "https://test-project.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
};

function configure(extra: Record<string, string> = {}) {
  installDeno({ ...BASE_ENV, GEMINI_API_KEY: "test-gemini-key", ...extra });
}

/** Admin bypasses the gateway's credit reservation. */
function adminUser() {
  givenUser({ id: OWNER_ID, email: "owner@test.local" });
  givenRows("profiles", [
    { id: OWNER_ID, email: "owner@test.local", role: "admin" },
  ]);
  givenRows("user_roles", [{ user_id: OWNER_ID, role: "admin" }]);
}

function paidUser(plan = "pro") {
  givenUser({ id: OWNER_ID, email: "owner@test.local" });
  givenRows("profiles", [
    { id: OWNER_ID, email: "owner@test.local", role: "client" },
  ]);
  givenRows("user_roles", []);
  givenRows("user_paid_status", [
    { user_id: OWNER_ID, is_paid: true, plan, paid_until: null },
  ]);
}

function stubVision(text: string, status = 200) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(
      JSON.stringify({
        candidates: [{ content: { parts: [{ text }] } }],
      }),
      { status, headers: { "Content-Type": "application/json" } },
    ),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const GOOD = JSON.stringify({
  consoleVisible: true,
  widthMm: 1800.4,
  heightMm: 520,
  depthMm: 400,
  confidence: "high",
  notes: ["floating oak unit"],
});

beforeEach(() => {
  resetCapture();
  configure();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ai-tv-console-extract gates", () => {
  it("rejects GET with 405", async () => {
    const res = await handler(req("GET", "", undefined));
    expect(res.status).toBe(405);
    expect((await json(res)).code).toBe("METHOD_NOT_ALLOWED");
  });

  it("reports NOT_CONFIGURED instead of crashing when the key is absent", async () => {
    installDeno(BASE_ENV);
    const res = await handler(
      req("POST", "", { imageDataUrl: IMAGE }, OWNER_AUTH),
    );
    expect(res.status).toBe(503);
    expect((await json(res)).code).toBe("NOT_CONFIGURED");
  });

  it("requires a bearer token", async () => {
    givenUser({ id: OWNER_ID, email: "owner@test.local" });
    const res = await handler(req("POST", "", { imageDataUrl: IMAGE }));
    expect(res.status).toBe(401);
    expect((await json(res)).code).toBe("AUTH_REQUIRED");
  });

  it("rejects a token that does not resolve to a user", async () => {
    givenUser(null);
    const res = await handler(
      req("POST", "", { imageDataUrl: IMAGE }, OWNER_AUTH),
    );
    expect(res.status).toBe(401);
  });

  it("refuses a free account before calling the provider", async () => {
    givenUser({ id: OWNER_ID, email: "free@test.local" });
    givenRows("profiles", [{ id: OWNER_ID, role: "client" }]);
    givenRows("user_roles", []);
    givenRows("user_paid_status", [
      { user_id: OWNER_ID, is_paid: true, plan: "free", paid_until: null },
    ]);
    const fetchMock = stubVision(GOOD);
    const res = await handler(
      req("POST", "", { imageDataUrl: IMAGE }, OWNER_AUTH),
    );
    expect(res.status).toBe(403);
    expect((await json(res)).code).toBe("PRO_REQUIRED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refuses an expired subscription", async () => {
    givenUser({ id: OWNER_ID, email: "owner@test.local" });
    givenRows("profiles", [{ id: OWNER_ID, role: "client" }]);
    givenRows("user_roles", []);
    givenRows("user_paid_status", [
      {
        user_id: OWNER_ID,
        is_paid: true,
        plan: "pro",
        paid_until: "2020-01-01T00:00:00.000Z",
      },
    ]);
    const fetchMock = stubVision(GOOD);
    const res = await handler(
      req("POST", "", { imageDataUrl: IMAGE }, OWNER_AUTH),
    );
    expect(res.status).toBe(403);
    expect((await json(res)).code).toBe("PRO_REQUIRED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a non-image data URL", async () => {
    adminUser();
    const fetchMock = stubVision(GOOD);
    const res = await handler(
      req(
        "POST",
        "",
        { imageDataUrl: "data:text/html;base64,PHNjcmlwdD4=" },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(400);
    expect((await json(res)).code).toBe("INVALID_IMAGE");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an oversized data URL", async () => {
    adminUser();
    const huge = `data:image/png;base64,${"A".repeat(8_000_001)}`;
    const res = await handler(
      req("POST", "", { imageDataUrl: huge }, OWNER_AUTH),
    );
    expect(res.status).toBe(400);
    expect((await json(res)).code).toBe("INVALID_IMAGE");
  });

  it("rejects a malformed JSON body", async () => {
    adminUser();
    const res = await handler(
      new Request("https://test-project.supabase.co/functions/v1/fn", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...OWNER_AUTH },
        body: "{not json",
      }),
    );
    expect(res.status).toBe(400);
    expect((await json(res)).code).toBe("INVALID_BODY");
  });
});

describe("ai-tv-console-extract extraction", () => {
  it("returns rounded dimensions and asks for confirmation", async () => {
    adminUser();
    const fetchMock = stubVision(`Here you go:\n\`\`\`json\n${GOOD}\n\`\`\``);
    const res = await handler(
      req("POST", "", { imageDataUrl: IMAGE }, OWNER_AUTH),
    );
    expect(res.status).toBe(200);
    const { extraction } = await json(res);
    expect(extraction.widthMm).toBe(1800);
    expect(extraction.heightMm).toBe(520);
    expect(extraction.depthMm).toBe(400);
    expect(extraction.confidence).toBe("high");
    expect(extraction.requiresUserConfirmation).toBe(true);
    expect(extraction.notes).toContain("floating oak unit");

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toContain("gemini-3.6-flash");
    const sent = JSON.parse(init.body as string);
    expect(sent.generationConfig.responseMimeType).toBe("application/json");
    expect(sent.contents[0].parts[0].inlineData.mimeType).toBe("image/jpeg");
    expect(sent.contents[0].parts[1].text).toMatch(/millimetres/);
  });

  it("refuses to invent dimensions when no console is visible", async () => {
    paidUser();
    stubVision(
      JSON.stringify({
        consoleVisible: false,
        widthMm: 1600,
        heightMm: 500,
        depthMm: 380,
        confidence: "high",
        notes: [],
      }),
    );
    const res = await handler(
      req("POST", "", { imageDataUrl: IMAGE }, OWNER_AUTH),
    );
    expect(res.status).toBe(200);
    const { extraction } = await json(res);
    expect(extraction.consoleVisible).toBe(false);
    expect(extraction.widthMm).toBeNull();
    expect(extraction.heightMm).toBeNull();
    expect(extraction.depthMm).toBeNull();
    expect(extraction.notes.join(" ")).toMatch(/No TV console/);
  });

  it("drops implausible sizes to null", async () => {
    adminUser();
    stubVision(
      JSON.stringify({
        consoleVisible: true,
        widthMm: 40,
        heightMm: 99999,
        depthMm: 400,
        confidence: "medium",
        notes: [],
      }),
    );
    const res = await handler(
      req("POST", "", { imageDataUrl: IMAGE }, OWNER_AUTH),
    );
    const { extraction } = await json(res);
    expect(extraction.widthMm).toBeNull();
    expect(extraction.heightMm).toBeNull();
    expect(extraction.depthMm).toBe(400);
  });

  it("defaults an unknown confidence to low", async () => {
    adminUser();
    stubVision(
      JSON.stringify({
        consoleVisible: true,
        widthMm: 1800,
        heightMm: 500,
        depthMm: 400,
        confidence: "certain",
        notes: [],
      }),
    );
    const res = await handler(
      req("POST", "", { imageDataUrl: IMAGE }, OWNER_AUTH),
    );
    expect((await json(res)).extraction.confidence).toBe("low");
  });

  it("maps a provider error to 502 VISION_FAILED", async () => {
    adminUser();
    stubVision("upstream boom", 500);
    const res = await handler(
      req("POST", "", { imageDataUrl: IMAGE }, OWNER_AUTH),
    );
    expect(res.status).toBe(502);
    expect((await json(res)).code).toBe("VISION_FAILED");
  });

  it("maps unreadable model output to 502 VISION_FAILED", async () => {
    adminUser();
    stubVision("I cannot help with that request.");
    const res = await handler(
      req("POST", "", { imageDataUrl: IMAGE }, OWNER_AUTH),
    );
    expect(res.status).toBe(502);
    expect((await json(res)).code).toBe("VISION_FAILED");
  });
});

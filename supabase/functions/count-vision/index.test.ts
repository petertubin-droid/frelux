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

const BASE_ENV = {
  SUPABASE_URL: "https://test-project.supabase.co",
  SUPABASE_ANON_KEY: "test-anon-key",
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
};

function configure(extra: Record<string, string> = {}) {
  installDeno({ ...BASE_ENV, GEMINI_API_KEY: "test-gemini-key", ...extra });
}

function stubGeminiCount(answer: Record<string, unknown>, status = 200) {
  const fetchMock = vi.fn().mockImplementation((url: string | URL) => {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify(answer) }],
              },
            },
          ],
        }),
        { status, headers: { "Content-Type": "application/json" } },
      ),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

beforeEach(() => {
  resetCapture();
  configure();
  givenUser({ id: OWNER_ID, email: "owner@test.local" });
  givenRows("profiles", [{ id: OWNER_ID, email: "owner@test.local", role: "admin" }]);
  givenRows("site_settings", [{ ai_enabled: true }]);
  givenRows("count_vision_log", []);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("count-vision edge function", () => {
  it("rejects non-POST with 405", async () => {
    const res = await handler(req("GET", "", undefined, OWNER_AUTH));
    expect(res.status).toBe(405);
  });

  it("rejects missing image with 400", async () => {
    const res = await handler(req("POST", "", { itemHint: "blocks" }, OWNER_AUTH));
    expect(res.status).toBe(400);
  });

  it("returns count answer when Gemini succeeds", async () => {
    stubGeminiCount({
      verdict: "counted",
      count: 24,
      unitLabel: "blocks",
      confidence: 0.95,
      reason: "Counted 24 hollow blocks stacked neatly.",
    });

    const res = await handler(
      req(
        "POST",
        "",
        {
          imageDataUrl: "data:image/jpeg;base64,AQIDBA==",
          itemHint: "blocks",
        },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(data.result.verdict).toBe("counted");
    expect(data.result.count).toBe(24);
    expect(data.result.unitLabel).toBe("blocks");
    expect(data.result.confidence).toBe(0.95);
  });
});

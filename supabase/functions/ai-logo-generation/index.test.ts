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

function stubGeminiImage(status = 200) {
  const fetchMock = vi.fn().mockImplementation((url: string | URL) => {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    inlineData: {
                      mimeType: "image/png",
                      data: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
                    },
                  },
                ],
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
  givenRows("site_settings", [{ brand_studio_enabled: true, ai_logo_daily_limit: 10 }]);
  givenRows("ai_logo_generations", []);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ai-logo-generation edge function", () => {
  it("rejects non-POST with 405", async () => {
    const res = await handler(req("GET", "", undefined, OWNER_AUTH));
    expect(res.status).toBe(405);
  });

  it("rejects missing prompt or userId with 400", async () => {
    const res = await handler(req("POST", "", { prompt: "" }, OWNER_AUTH));
    expect(res.status).toBe(400);
  });

  it("rejects when AI service is not configured with 503", async () => {
    installDeno(BASE_ENV);
    const res = await handler(
      req("POST", "", { prompt: "Modern Logo", userId: OWNER_ID }, OWNER_AUTH),
    );
    expect(res.status).toBe(503);
  });

  it("generates logo image successfully with image fallback", async () => {
    stubGeminiImage();
    const res = await handler(
      req(
        "POST",
        "",
        {
          prompt: "Eco Friendly Construction",
          industry: "Architecture",
          style: "Minimalist",
          userId: OWNER_ID,
        },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(data.imageUrl).toBeTruthy();
    expect(data.imageUrl).toMatch(/^data:image\/png;base64,/);
    expect(data.prompt).toBe("Eco Friendly Construction");
  });
});

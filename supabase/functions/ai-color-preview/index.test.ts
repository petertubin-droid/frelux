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

function adminUser() {
  givenUser({ id: OWNER_ID, email: "owner@test.local" });
  givenRows("profiles", [
    { id: OWNER_ID, email: "owner@test.local", role: "admin" },
  ]);
  givenRows("user_roles", [{ user_id: OWNER_ID, role: "admin" }]);
  givenRows("site_settings", [{ ai_enabled: true, ai_access_mode: "paid" }]);
}

function stubGemini(text: string, status = 200) {
  const fetchMock = vi.fn().mockImplementation((url: string | URL, init?: RequestInit) => {
    if (String(url).includes("/auth/v1/user")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ id: OWNER_ID, email: "owner@test.local" }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        ),
      );
    }
    const requestBody = JSON.parse(String(init?.body ?? "{}"));
    const isImageRequest = requestBody?.generationConfig?.responseModalities?.includes("IMAGE");
    return Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [{
            content: {
              parts: isImageRequest
                ? [{ inlineData: { mimeType: "image/png", data: "AQID" } }]
                : [{ text }],
            },
          }],
        }),
        { status, headers: { "Content-Type": "application/json" } },
      ),
    );
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

const GOOD_RESPONSE = JSON.stringify({
  previewDescription: "The warm terracotta brings a cozy feel to the space.",
  decorAdvice: "Pair the slate accent wall with natural oak furniture and linen curtains.",
  colorSuggestions: [
    {
      hex: "#E07A5F",
      name: "Terracotta Warmth",
      reasoning: "Complements natural light",
      coverageArea: "Accent wall",
      finish: "Eggshell",
    },
  ],
  applicationTips: ["Use 2 coats of satin finish."],
  imagePrompt: "Photorealistic living room with the terracotta accent wall.",
});

beforeEach(() => {
  resetCapture();
  configure();
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ai-color-preview edge function", () => {
  it("rejects non-POST with 405", async () => {
    adminUser();
    const res = await handler(req("GET", "", undefined, OWNER_AUTH));
    expect(res.status).toBe(405);
    expect((await json(res)).code).toBe("METHOD_NOT_ALLOWED");
  });

  it("rejects unauthenticated user when access mode is paid", async () => {
    givenUser(null);
    givenRows("site_settings", [{ ai_enabled: true, ai_access_mode: "paid" }]);
    const res = await handler(
      req("POST", "", { targetColors: [{ name: "Red", hex: "#FF0000" }] }),
    );
    expect(res.status).toBe(401);
    expect((await json(res)).code).toBe("AUTH_REQUIRED");
  });

  it("rejects missing target colors with 400", async () => {
    adminUser();
    const res = await handler(
      req("POST", "", { targetColors: [] }, OWNER_AUTH),
    );
    expect(res.status).toBe(400);
    expect((await json(res)).code).toBe("BAD_REQUEST");
  });

  it("handles missing API key gracefully with 503", async () => {
    adminUser();
    installDeno(BASE_ENV); // no GEMINI_API_KEY
    const res = await handler(
      req(
        "POST",
        "",
        { targetColors: [{ name: "Blue", hex: "#0000FF" }] },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(503);
    expect((await json(res)).code).toBe("NO_API_KEY");
  });

  it("passes the uploaded room photo to Gemini as multimodal image input", async () => {
    adminUser();
    const fetchMock = stubGemini(GOOD_RESPONSE);
    const imageDataUrl = "data:image/jpeg;base64,MTIzNDU2Nzg=";
    const res = await handler(
      req(
        "POST",
        "",
        {
          imageDataUrl,
          targetColors: [{ name: "Terracotta", hex: "#E07A5F" }],
        },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(200);
    const geminiRequest = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("generateContent"),
    );
    expect(geminiRequest).toBeTruthy();
    const requestBody = JSON.parse(String(geminiRequest?.[1]?.body));
    expect(requestBody.contents[0].parts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ inlineData: { mimeType: "image/jpeg", data: "MTIzNDU2Nzg=" } }),
      ]),
    );
  });

  it("rejects unsupported image data before calling the provider", async () => {
    adminUser();
    const fetchMock = stubGemini(GOOD_RESPONSE);
    const res = await handler(
      req(
        "POST",
        "",
        {
          imageDataUrl: "data:text/html;base64,PHNjcmlwdD4=",
          targetColors: [{ name: "Terracotta", hex: "#E07A5F" }],
        },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(400);
    expect((await json(res)).code).toBe("BAD_IMAGE");
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("generativelanguage.googleapis.com"))).toBe(false);
  });

  it("successfully generates preview for admin user", async () => {
    adminUser();
    const fetchMock = stubGemini(GOOD_RESPONSE);
    const res = await handler(
      req(
        "POST",
        "",
        {
          targetColors: [{ name: "Terracotta", hex: "#E07A5F" }],
          roomType: "Living Room",
          lightingCondition: "Natural daylight",
        },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(data.result.previewDescription).toContain("terracotta");
    expect(data.result.colorSuggestions).toHaveLength(1);
    expect(data.result.decorAdvice).toContain("natural oak");
    expect(data.result.previewImageUrl).toMatch(/^data:image\/png;base64,AQID$/);
    expect(fetchMock.mock.calls.some(([url, init]) =>
      String(url).includes("generateContent") &&
      String(init?.body).includes("responseModalities"),
    )).toBe(true);
  });
});

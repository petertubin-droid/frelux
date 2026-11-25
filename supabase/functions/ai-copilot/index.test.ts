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

function stubGeminiCopilot(interpretation: Record<string, unknown>, status = 200) {
  const fetchMock = vi.fn().mockImplementation((url: string | URL) => {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({ interpretation }),
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
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ai-copilot edge function", () => {
  it("rejects unauthorized request with 401", async () => {
    givenUser(null);
    const res = await handler(req("POST", "", { text: "I want to estimate a 3 bedroom bungalow" }));
    expect(res.status).toBe(401);
  });

  it("rejects empty text with 400", async () => {
    const res = await handler(req("POST", "", { text: "" }, OWNER_AUTH));
    expect(res.status).toBe(400);
  });

  it("extracts facts and interpretation from natural language prompt", async () => {
    stubGeminiCopilot({
      taskType: "building_estimate",
      facts: [
        { key: "bedrooms", label: "Bedrooms", value: 3, unit: "rooms", evidence: "3 bedroom" },
        { key: "building_type", label: "Building Type", value: "bungalow", evidence: "bungalow" }
      ],
    });

    const res = await handler(
      req("POST", "", { text: "I need to estimate a 3 bedroom bungalow" }, OWNER_AUTH),
    );
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(data.interpretation.taskType).toBe("building_estimate");
    expect(data.interpretation.facts).toHaveLength(2);
  });
});

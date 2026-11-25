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

function stubGemini(text: string, status = 200) {
  const fetchMock = vi.fn().mockImplementation((url: string | URL) => {
    return Promise.resolve(
      new Response(
        JSON.stringify({
          candidates: [
            {
              content: {
                parts: [{ text }],
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
  givenRows("learn_articles", []);
  givenRows("ai_request_log", []);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ai-learn-assistant edge function", () => {
  it("rejects when AI is unconfigured with 503", async () => {
    installDeno(BASE_ENV);
    const res = await handler(req("POST", "", { action: "ask", question: "How to screed walls?" }, OWNER_AUTH));
    expect(res.status).toBe(503);
  });

  it("answers learning question cleanly", async () => {
    stubGemini("To screed walls properly, clean dust and apply a primer coat first.");
    const res = await handler(
      req(
        "POST",
        "",
        {
          action: "ask",
          question: "How to screed walls?",
        },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(data.result).toContain("clean dust");
  });
});

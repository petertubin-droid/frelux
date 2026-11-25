import "./index.ts";
import {
  getHandler,
  installDeno,
  json,
  req,
  resetCapture,
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
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("support-chat edge function", () => {
  it("rejects non-POST with 405", async () => {
    const res = await handler(req("GET", ""));
    expect(res.status).toBe(405);
  });

  it("handles health_check immediately", async () => {
    const res = await handler(req("POST", "", { health_check: true }));
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(data.status).toBe("healthy");
  });

  it("rejects empty message with 400", async () => {
    const res = await handler(req("POST", "", { message: "" }));
    expect(res.status).toBe(400);
  });

  it("returns AI assistance response cleanly sanitized", async () => {
    stubGemini("Hello! You can use our building calculator to calculate materials.");
    const res = await handler(req("POST", "", { message: "How do I calculate cement?" }));
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(data.reply).toContain("building calculator");
  });
});

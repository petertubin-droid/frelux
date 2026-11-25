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
  installDeno({ ...BASE_ENV, STUDIO_AGENT_API_KEY: "test-agent-key", ...extra });
}

function stubStudio(reply: string, status = 200) {
  const fetchMock = vi.fn().mockImplementation((url: string | URL) => {
    const urlStr = String(url);
    if (urlStr.includes("/conversations") && !urlStr.includes("/messages")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ id: "studio-conv-1" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    }
    return Promise.resolve(
      new Response(
        JSON.stringify({ response: reply }),
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

describe("ai-studio edge function", () => {
  it("rejects non-admin caller with 403", async () => {
    givenRows("profiles", [{ id: OWNER_ID, email: "owner@test.local", role: "user" }]);
    const res = await handler(req("POST", "", { tool: "chat", prompt: "Explain react memo" }, OWNER_AUTH));
    expect(res.status).toBe(403);
  });

  it("handles studio tool request cleanly", async () => {
    stubStudio("React.memo prevents unnecessary re-renders.");
    const res = await handler(
      req("POST", "", { tool: "chat", prompt: "Explain react memo" }, OWNER_AUTH),
    );
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(data.response).toContain("re-renders");
    expect(data.tool).toBe("chat");
  });
});

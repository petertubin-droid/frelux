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
  installDeno({ ...BASE_ENV, SOLAS_API_KEY: "test-solas-key", ...extra });
}

function stubSolas(reply: string, status = 200) {
  const fetchMock = vi.fn().mockImplementation((url: string | URL) => {
    const urlStr = String(url);
    if (urlStr.includes("/conversations") && !urlStr.includes("/messages")) {
      return Promise.resolve(
        new Response(
          JSON.stringify({ id: "conv-123" }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      );
    }
    return Promise.resolve(
      new Response(
        JSON.stringify({ response: reply, id: "msg-123" }),
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
  givenRows("site_settings", [{ solas_agent_id: "agent-123" }]);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ai-admin-assistant edge function", () => {
  it("rejects unauthorized caller with 401", async () => {
    givenUser(null);
    const res = await handler(req("POST", "", { message: "Status report" }));
    expect(res.status).toBe(401);
  });

  it("rejects non-admin caller with 403", async () => {
    givenRows("profiles", [{ id: OWNER_ID, email: "owner@test.local", role: "user" }]);
    const res = await handler(req("POST", "", { message: "Status report" }, OWNER_AUTH));
    expect(res.status).toBe(403);
  });

  it("relays admin message through Solas successfully", async () => {
    stubSolas("All systems operational.");
    const res = await handler(
      req("POST", "", { message: "Check database health" }, OWNER_AUTH),
    );
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(data.response).toBe("All systems operational.");
    expect(data.engine).toBe("solas");
    expect(data.conversationId).toBe("conv-123");
  });
});

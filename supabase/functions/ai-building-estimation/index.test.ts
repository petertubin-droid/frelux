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

beforeEach(() => {
  resetCapture();
  configure();
  givenUser({ id: OWNER_ID, email: "owner@test.local" });
  givenRows("profiles", [{ id: OWNER_ID, email: "owner@test.local", role: "admin" }]);
  givenRows("site_settings", [{
    estimation_enabled: true,
    estimation_access_mode: "free",
    estimation_daily_free_uses: 5,
    estimation_admin_override: true,
  }]);
  givenRows("rewarded_unlock_log", []);
  givenRows("estimation_usage_daily", []);
  givenRows("estimation_usage_log", []);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("ai-building-estimation edge function", () => {
  it("rejects non-POST with 405", async () => {
    const res = await handler(req("GET", "", undefined, OWNER_AUTH));
    expect(res.status).toBe(405);
  });

  it("rejects missing image with 400", async () => {
    const res = await handler(req("POST", "", { projectName: "Test" }, OWNER_AUTH));
    expect(res.status).toBe(400);
  });

  it("rejects non-Nigerian market with 422 explaining market pricing limitation", async () => {
    const res = await handler(
      req(
        "POST",
        "",
        {
          imageDataUrl: "data:image/jpeg;base64,AQID",
          market: "US",
        },
        OWNER_AUTH,
      ),
    );
    expect(res.status).toBe(422);
    const data = await json(res);
    expect(data.code).toBe("PRICE_NOT_DETERMINED");
    expect(data.market).toBe("US");
  });
});

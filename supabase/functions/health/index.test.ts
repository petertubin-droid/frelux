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
  SUPABASE_SERVICE_ROLE_KEY: "test-service-key",
};

beforeEach(() => {
  resetCapture();
  installDeno({ ...BASE_ENV, GOOGLE_AI_API_KEY: "test-google-key" });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("health edge function", () => {
  it("rejects non-GET with 405", async () => {
    const res = await handler(req("POST", ""));
    expect(res.status).toBe(405);
  });

  it("recognizes GOOGLE_AI_API_KEY alias for ai_providers check", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const res = await handler(req("GET", ""));
    expect(res.status).toBe(200);
    const data = await json(res);
    expect(data.checks.ai_providers).toBe("up");
  });
});

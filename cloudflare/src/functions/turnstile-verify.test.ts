/**
 * Wave 3: turnstile-verify runs natively with the same contract as the
 * Supabase function, using the same shared verdict module.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { turnstileVerify } from "./turnstile-verify";
import type { ApiEnv } from "../api";

const configured = (overrides: Partial<ApiEnv> = {}): ApiEnv => ({
  TURNSTILE_SECRET: "secret",
  TURNSTILE_HOSTNAMES: "freluxtools.com",
  ...overrides,
});

const post = (body: unknown, env = configured()) =>
  turnstileVerify(
    new Request("https://files.example/api/fn/turnstile-verify", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "203.0.113.5" },
      body: JSON.stringify(body),
    }),
    env,
    new URL("https://files.example/api/fn/turnstile-verify"),
  );

const siteverify = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("turnstile-verify (native)", () => {
  it("passes when Cloudflare vouches for the token and hostname", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => siteverify({ success: true, action: "signup", hostname: "freluxtools.com" })));
    const res = await post({ token: "tok", action: "signup" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("rejects a token Cloudflare does not accept", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => siteverify({ success: false, "error-codes": ["invalid-input-response"] })));
    const res = await post({ token: "bad", action: "signup" });
    expect(res.status).toBe(403);
    const body = (await res.json()) as { ok: boolean; error: string };
    expect(body.ok).toBe(false);
    expect(typeof body.error).toBe("string");
  });

  it("stays open, but visibly unconfigured, without a secret", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await post({ token: "tok", action: "signup" }, configured({ TURNSTILE_SECRET: undefined }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, configured: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects free-text actions and malformed bodies", async () => {
    const badAction = await post({ token: "tok", action: "sign up now!" });
    expect(badAction.status).toBe(400);
    expect(await badAction.json()).toEqual({ ok: false, error: "invalid_action" });

    const badJson = await turnstileVerify(
      new Request("https://files.example/api/fn/turnstile-verify", {
        method: "POST",
        body: "not json",
      }),
      configured(),
      new URL("https://files.example/api/fn/turnstile-verify"),
    );
    expect(badJson.status).toBe(400);
    expect(await badJson.json()).toEqual({ ok: false, error: "invalid_json" });
  });

  it("rejects non-POST", async () => {
    const res = await turnstileVerify(
      new Request("https://files.example/api/fn/turnstile-verify"),
      configured(),
      new URL("https://files.example/api/fn/turnstile-verify"),
    );
    expect(res.status).toBe(405);
  });
});

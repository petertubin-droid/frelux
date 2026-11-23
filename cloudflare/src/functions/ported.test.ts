import { afterEach, describe, expect, it, vi } from "vitest";

import { healthConfig } from "./health";
import { turnstileVerifyConfig } from "./turnstile-verify";
import { getPortedFunction, portedFunctionNames } from "./registry";
import { checkRateLimit, missingBindings, timingSafeEqual } from "./runtime";

const CORS = { "access-control-allow-origin": "https://freluxtools.com" };
const env = {
  SUPABASE_URL: "https://project.supabase.co",
  TURNSTILE_SECRET: "secret",
  TURNSTILE_HOSTNAMES: "freluxtools.com,www.freluxtools.com",
};

afterEach(() => vi.restoreAllMocks());

describe("runtime", () => {
  it("reports exactly the missing bindings, never a fabricated value", () => {
    expect(missingBindings({}, ["A", "B"])).toEqual(["A", "B"]);
    expect(missingBindings({ A: "  " }, ["A"])).toEqual(["A"]);
    expect(missingBindings({ A: "x" }, ["A"])).toEqual([]);
  });

  it("compares secrets in constant time", () => {
    expect(timingSafeEqual("abc", "abc")).toBe(true);
    expect(timingSafeEqual("abc", "abd")).toBe(false);
    expect(timingSafeEqual("abc", "abcd")).toBe(false);
  });

  it("rate limits per key and reports a retry delay", () => {
    const first = checkRateLimit("k1", { maxRequests: 2, windowMs: 1000 }, 0);
    expect(first.allowed).toBe(true);
    checkRateLimit("k1", { maxRequests: 2, windowMs: 1000 }, 10);
    const third = checkRateLimit("k1", { maxRequests: 2, windowMs: 1000 }, 20);
    expect(third.allowed).toBe(false);
    expect(third.retryAfterSeconds).toBeGreaterThan(0);
    // a different key is unaffected
    expect(checkRateLimit("k2", { maxRequests: 2, windowMs: 1000 }, 20).allowed).toBe(true);
  });
});

describe("registry", () => {
  it("lists exactly the functions that run on the Worker", () => {
    expect(portedFunctionNames()).toEqual(["health", "turnstile-verify"]);
  });

  it("returns undefined for an unported name so the proxy still answers", () => {
    expect(getPortedFunction("btcpay-checkout")).toBeUndefined();
  });

  it("declares the bindings each port needs", () => {
    expect(healthConfig.requiredBindings).toEqual(["SUPABASE_URL"]);
    expect(turnstileVerifyConfig.requiredBindings).toEqual([
      "TURNSTILE_SECRET",
      "TURNSTILE_HOSTNAMES",
    ]);
  });
});

describe("health port", () => {
  it("reports healthy when the database probe answers", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("[]", { status: 200 })),
    );
    const res = await healthConfig.handler(
      new Request("https://api.freluxtools.com/api/fn/health"),
      env,
      {},
      CORS,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.runtime).toBe("cloudflare-workers");
    expect(body.checks.database).toBe("up");
    expect(body.checks.ai_providers).toBe("not-ported");
  });

  it("degrades instead of claiming health when the probe fails", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("boom", { status: 500 })));
    const res = await healthConfig.handler(
      new Request("https://api.freluxtools.com/api/fn/health"),
      env,
      {},
      CORS,
    );
    expect(res.status).toBe(503);
    expect((await res.json()).status).toBe("degraded");
  });

  it("says the database was not probed when the binding is missing", async () => {
    const res = await healthConfig.handler(
      new Request("https://api.freluxtools.com/api/fn/health"),
      {},
      {},
      CORS,
    );
    const body = await res.json();
    expect(body.checks.database).toBe("unknown");
    expect(body.notes.join(" ")).toContain("not probed");
  });
});

describe("turnstile-verify port", () => {
  const req = (body: unknown) =>
    new Request("https://api.freluxtools.com/api/fn/turnstile-verify", {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "1.2.3.4" },
      body: JSON.stringify(body),
    });

  it("accepts a token Cloudflare vouches for, on an allowlisted host, for the same action", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ success: true, action: "signup", hostname: "freluxtools.com" }),
          { status: 200 },
        ),
      ),
    );
    const res = await turnstileVerifyConfig.handler(
      req({ token: "t", action: "signup" }),
      env,
      {},
      CORS,
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, hostname: "freluxtools.com" });
  });

  it("refuses an action mismatch and a hostname outside the allowlist", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ success: true, action: "login", hostname: "evil.example" }),
          { status: 200 },
        ),
      ),
    );
    const mismatch = await turnstileVerifyConfig.handler(
      req({ token: "t", action: "signup" }),
      env,
      {},
      CORS,
    );
    expect(mismatch.status).toBe(403);
    expect((await mismatch.json()).error).toBe("action-mismatch");
  });

  it("fails closed when the secret or hostname list is not configured", async () => {
    const noSecret = await turnstileVerifyConfig.handler(
      req({ token: "t", action: "signup" }),
      { TURNSTILE_HOSTNAMES: "freluxtools.com" },
      {},
      CORS,
    );
    expect(noSecret.status).toBe(503);
    const noHosts = await turnstileVerifyConfig.handler(
      req({ token: "t", action: "signup" }),
      { TURNSTILE_SECRET: "s", TURNSTILE_HOSTNAMES: "" },
      {},
      CORS,
    );
    expect(noHosts.status).toBe(503);
  });

  it("rejects a missing or oversized token before calling siteverify", async () => {
    const spy = vi.fn();
    vi.stubGlobal("fetch", spy);
    const missing = await turnstileVerifyConfig.handler(
      req({ action: "signup" }),
      env,
      {},
      CORS,
    );
    expect(missing.status).toBe(403);
    const long = await turnstileVerifyConfig.handler(
      req({ token: "x".repeat(2049), action: "signup" }),
      env,
      {},
      CORS,
    );
    expect(long.status).toBe(403);
    expect(spy).not.toHaveBeenCalled();
  });

  it("refuses GET", async () => {
    const res = await turnstileVerifyConfig.handler(
      new Request("https://api.freluxtools.com/api/fn/turnstile-verify"),
      env,
      {},
      CORS,
    );
    expect(res.status).toBe(405);
  });
});

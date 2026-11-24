import { afterEach, describe, expect, it, vi } from "vitest";

import { healthConfig } from "./health";
import { turnstileVerifyConfig } from "./turnstile-verify";
import { verifyCopyGetConfig } from "./verify-copy-get";
import { clientIdentityConfig } from "./client-identity";
import { seoSearchConsoleConfig } from "./seo-search-console";
import { getPortedFunction, portedFunctionNames } from "./registry";
import { grantRewardedUnlockConfig, verifyRewardedAdConfig } from "./rewarded";
import { ec3EpdLookupConfig } from "./ec3-epd-lookup";
import { priceIndexApiConfig, removeOutliers, stats } from "./price-index-api";
import { checkRateLimit, missingBindings, timingSafeEqual } from "./runtime";
import {
  AWAITING_CPU_MEASUREMENT,
  SUPABASE_ONLY,
  needsCpuMeasurement,
  supabaseOnlyReason,
} from "./registry";

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
    expect(portedFunctionNames()).toEqual([
      "client-identity",
      "document-print-pass",
      "ec3-epd-lookup",
      "grant-rewarded-unlock",
      "health",
      "price-index-api",
      "seo-search-console",
      "turnstile-verify",
      "verify-copy-get",
      "verify-rewarded-ad",
    ]);
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

describe("rewarded ad ports", () => {
  const post = (name: string, body: unknown) =>
    new Request(`https://api.freluxtools.com/api/fn/${name}`, {
      method: "POST",
      headers: { "content-type": "application/json", "cf-connecting-ip": "9.9.9.9" },
      body: JSON.stringify(body),
    });

  it("refuses to grant credits when provider verification is not configured", async () => {
    const res = await verifyRewardedAdConfig.handler(
      post("verify-rewarded-ad", { adProvider: "monetag", adEventId: "e1" }),
      {},
      {},
      CORS,
    );
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.success).toBe(false);
    expect(body.code).toBe("SERVER_VERIFICATION_NOT_CONFIGURED");
  });

  it("requires the fields it names, and rejects an unknown mode", async () => {
    const missing = await verifyRewardedAdConfig.handler(
      post("verify-rewarded-ad", { adProvider: "monetag" }),
      {},
      {},
      CORS,
    );
    expect(missing.status).toBe(400);
    const badMode = await verifyRewardedAdConfig.handler(
      post("verify-rewarded-ad", { adProvider: "m", adEventId: "e", mode: "steal" }),
      {},
      {},
      CORS,
    );
    expect(badMode.status).toBe(400);
  });

  it("never grants an unlock from a client hash", async () => {
    const res = await grantRewardedUnlockConfig.handler(
      post("grant-rewarded-unlock", { toolKey: "roof", clientHash: "abc" }),
      {},
      {},
      CORS,
    );
    expect(res.status).toBe(503);
    expect((await res.json()).success).toBe(false);
  });
});

describe("ec3-epd-lookup port", () => {
  const req = (body: unknown) =>
    new Request("https://api.freluxtools.com/api/fn/ec3-epd-lookup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });

  it("refuses with a precise reason when the key is not configured", async () => {
    const res = await ec3EpdLookupConfig.handler(req({ materialQuery: "cement" }), {}, {}, CORS);
    expect(res.status).toBe(503);
    expect((await res.json()).error).toContain("EC3_API_KEY");
  });

  it("requires a search term and caps the limit", async () => {
    const spy = vi.fn(async () =>
      new Response(JSON.stringify({ epds: [] }), { status: 200 }),
    );
    vi.stubGlobal("fetch", spy);
    const noTerm = await ec3EpdLookupConfig.handler(
      req({}),
      { EC3_API_KEY: "k" },
      {},
      CORS,
    );
    expect(noTerm.status).toBe(400);
    const res = await ec3EpdLookupConfig.handler(
      req({ materialQuery: "cement", limit: 999 }),
      { EC3_API_KEY: "k" },
      {},
      CORS,
    );
    expect(res.status).toBe(200);
    expect(String(spy.mock.calls[0][0])).toContain("limit=20");
  });

  it("passes an upstream 401 through as a bad gateway", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response("nope", { status: 401 })));
    const res = await ec3EpdLookupConfig.handler(
      req({ materialQuery: "cement" }),
      { EC3_API_KEY: "k" },
      {},
      CORS,
    );
    expect(res.status).toBe(502);
  });
});

describe("price-index-api port", () => {
  it("refuses to publish without the service role binding", async () => {
    const res = await priceIndexApiConfig.handler(
      new Request("https://api.freluxtools.com/api/fn/price-index-api"),
      { SUPABASE_URL: "https://p.supabase.co" },
      {},
      CORS,
    );
    expect(res.status).toBe(503);
  });

  it("publishes a median only with three or more observations", () => {
    expect(stats([100, 200]).status).toBe("insufficient");
    const ok = stats([100, 200, 300]);
    expect(ok.status).toBe("ok");
    expect(ok.status === "ok" && ok.median).toBe(200);
  });

  it("drops a far outlier once there are enough observations to justify it", () => {
    const kept = removeOutliers([100, 102, 98, 101, 99, 5000]);
    expect(kept).not.toContain(5000);
  });

  it("reads prices and materials and gates the figure on samples", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes("estimation_prices")) {
        return new Response(
          JSON.stringify([
            { ref_id: "m1", price: 100, currency: "NGN", city_slug: null, price_kind: "retail", sale_unit: "bag", supplier_name: "A", price_source: "x", effective_date: "2026-11-01", verification_status: "verified" },
            { ref_id: "m1", price: 110, currency: "NGN", city_slug: null, price_kind: "retail", sale_unit: "bag", supplier_name: "B", price_source: "x", effective_date: "2026-11-02", verification_status: "verified" },
            { ref_id: "m1", price: 105, currency: "NGN", city_slug: null, price_kind: "retail", sale_unit: "bag", supplier_name: "C", price_source: "x", effective_date: "2026-11-03", verification_status: "verified" },
          ]),
          { status: 200 },
        );
      }
      return new Response(
        JSON.stringify([{ id: "m1", name: "Cement", slug: "cement", category: "binders" }]),
        { status: 200 },
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const res = await priceIndexApiConfig.handler(
      new Request("https://api.freluxtools.com/api/fn/price-index-api?material=cement"),
      { SUPABASE_URL: "https://p.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "svc" },
      {},
      CORS,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.materials_with_figure).toBe(1);
    expect(body.items[0].median).toBe(105);
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

describe("wave 2 ports", () => {
  it("verify-copy-get rejects a malformed token before any lookup", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo) => {
      calls.push(String(input));
      return new Response("[]", { status: 200 });
    }));
    const res = await verifyCopyGetConfig.handler(
      new Request("https://api.freluxtools.com/api/fn/verify-copy-get", {
        method: "POST",
        body: JSON.stringify({ token: "NOT-A-TOKEN!" }),
      }),
      { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "svc" },
      {},
      {},
    );
    expect(res.status).toBe(400);
    expect(calls.length).toBe(0);
  });

  it("verify-copy-get refuses to guess when the service role key is absent", async () => {
    const res = await verifyCopyGetConfig.handler(
      new Request("https://api.freluxtools.com/api/fn/verify-copy-get", {
        method: "POST",
        body: JSON.stringify({ token: "abcdefghijklmnop" }),
      }),
      { SUPABASE_URL: "https://x.supabase.co" },
      {},
      {},
    );
    expect(res.status).toBe(503);
  });

  it("client-identity requires a session before touching the database", async () => {
    const calls: string[] = [];
    vi.stubGlobal("fetch", vi.fn(async (input: RequestInfo) => {
      calls.push(String(input));
      return new Response("{}", { status: 200 });
    }));
    const res = await clientIdentityConfig.handler(
      new Request("https://api.freluxtools.com/api/fn/client-identity", {
        method: "POST",
        body: JSON.stringify({ action: "client_identity_submit" }),
      }),
      { SUPABASE_URL: "https://x.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "svc" },
      {},
      {},
    );
    expect(res.status).toBe(401);
    expect(calls.length).toBe(0);
  });

  it("seo-search-console reports not connected instead of inventing metrics", async () => {
    const res = await seoSearchConsoleConfig.handler(
      new Request("https://api.freluxtools.com/api/fn/seo-search-console", { method: "POST", body: "{}" }),
      {},
      {},
      {},
    );
    const body = (await res.json()) as { connected: boolean; reason: string };
    expect(res.status).toBe(200);
    expect(body.connected).toBe(false);
    expect(body.reason).toBe("no_credential");
  });
});

describe("free-tier rule", () => {
  it("never ports a function it also marks as Supabase-only", () => {
    const both = portedFunctionNames().filter((n) => supabaseOnlyReason(n));
    expect(both).toEqual([]);
  });

  it("gives every Supabase-only name a reason that says why", () => {
    for (const [name, reason] of SUPABASE_ONLY) {
      expect(reason.length).toBeGreaterThan(20);
      expect(reason).toMatch(/AI:|CPU-heavy:|paid/i);
      expect(name).toBeTruthy();
    }
  });

  it("flags unmeasured CPU only for functions that are actually ported", () => {
    for (const name of AWAITING_CPU_MEASUREMENT) {
      expect(portedFunctionNames()).toContain(name);
      expect(needsCpuMeasurement(name)).toBe(true);
    }
  });

  it("keeps the AI exclusion separate from the CPU exclusion", () => {
    const ai = [...SUPABASE_ONLY].filter(([, r]) => r.startsWith("AI:"));
    const cpu = [...SUPABASE_ONLY].filter(([, r]) => r.startsWith("CPU-heavy:"));
    expect(ai.length).toBe(20);
    expect(cpu.length).toBe(8);
  });
});

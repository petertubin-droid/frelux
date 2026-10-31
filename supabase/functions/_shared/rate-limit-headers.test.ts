import { describe, expect, it } from "vitest";
import { attachRateLimitHeaders, checkRateLimit } from "./rate-limit.ts";
import { rateLimitedResponse } from "./cors.ts";

describe("rate limit headers", () => {
  it("puts the remaining budget on a successful response", () => {
    const res = attachRateLimitHeaders(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
      { maxRequests: 60, remaining: 41, resetAt: 1_700_000_000_000 },
    );
    expect(res.status).toBe(200);
    expect(res.headers.get("X-RateLimit-Limit")).toBe("60");
    expect(res.headers.get("X-RateLimit-Remaining")).toBe("41");
    // Reset is expressed in epoch seconds, not milliseconds.
    expect(res.headers.get("X-RateLimit-Reset")).toBe("1700000000");
  });

  it("rounds the reset up so a caller never retries early", () => {
    const res = attachRateLimitHeaders(new Response(null), {
      maxRequests: 10,
      remaining: 0,
      resetAt: 1_700_000_000_001,
    });
    expect(res.headers.get("X-RateLimit-Reset")).toBe("1700000001");
  });

  it("keeps the body and status of the response it is given", async () => {
    const res = attachRateLimitHeaders(
      new Response(JSON.stringify({ error: "not_found" }), { status: 404 }),
      { maxRequests: 60, remaining: 12, resetAt: 1_700_000_000_000 },
    );
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "not_found" });
  });

  it("never throws on a response whose headers cannot be changed", () => {
    // A response fetched from elsewhere has immutable headers; a missing
    // rate-limit header must not break the answer the caller asked for.
    const immutable = new Response("body", { status: 200 });
    Object.freeze(immutable.headers);
    expect(() =>
      attachRateLimitHeaders(immutable, {
        maxRequests: 60,
        remaining: 5,
        resetAt: 1_700_000_000_000,
      }),
    ).not.toThrow();
  });
});

describe("the gateway composition", () => {
  // Mirrors what serveWithCors now does: limit, refuse, or route and attach.
  // The gateway module itself cannot be imported under Node because it pulls a
  // Supabase client that requires native WebSocket, so the composition is
  // pinned here instead of by pretending the entrypoint ran.
  const route = async () =>
    new Response(JSON.stringify({ ok: true }), { status: 200 });

  const serve = async (
    key: string,
    options: { maxRequests: number; windowMs: number },
  ) => {
    const rl = checkRateLimit(key, options);
    if (!rl.allowed) return rateLimitedResponse(rl.resetAt);
    return attachRateLimitHeaders(await route(), {
      maxRequests: options.maxRequests,
      remaining: rl.remaining,
      resetAt: rl.resetAt,
    });
  };

  it("counts down across calls on the same key", async () => {
    const options = { maxRequests: 3, windowMs: 60_000 };
    const first = await serve("compose:countdown", options);
    const second = await serve("compose:countdown", options);
    expect(first.headers.get("X-RateLimit-Remaining")).toBe("2");
    expect(second.headers.get("X-RateLimit-Remaining")).toBe("1");
  });

  it("refuses with a 429 that still states the reset and the wait", async () => {
    const options = { maxRequests: 1, windowMs: 60_000 };
    await serve("compose:refuse", options);
    const refused = await serve("compose:refuse", options);
    expect(refused.status).toBe(429);
    expect(refused.headers.get("X-RateLimit-Remaining")).toBe("0");
    expect(Number(refused.headers.get("Retry-After"))).toBeGreaterThanOrEqual(
      0,
    );
  });

  it("does not let one caller's budget touch another's", async () => {
    const options = { maxRequests: 1, windowMs: 60_000 };
    await serve("compose:alice", options);
    const bob = await serve("compose:bob", options);
    expect(bob.status).toBe(200);
    expect(bob.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});

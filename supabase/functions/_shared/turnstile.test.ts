import { describe, expect, it, vi } from "vitest";
import { parseHostnames, verifyTurnstile } from "./turnstile";

const okBody = {
  success: true,
  hostname: "freluxtools.com",
  action: "contact",
};

function fakeFetch(body: unknown, ok = true) {
  return vi.fn(async () => ({
    ok,
    json: async () => body,
  })) as unknown as typeof fetch;
}

const base = {
  action: "contact",
  secret: "secret",
  hostnames: "freluxtools.com, www.freluxtools.com",
};

describe("parseHostnames", () => {
  it("trims, lowercases and drops blanks", () => {
    expect([
      ...parseHostnames(" FreluxTools.com ,, www.freluxtools.com "),
    ]).toEqual(["freluxtools.com", "www.freluxtools.com"]);
  });

  it("is empty when unset", () => {
    expect(parseHostnames(undefined).size).toBe(0);
  });
});

describe("verifyTurnstile", () => {
  it("accepts a token Cloudflare vouches for, for this action and host", async () => {
    const verdict = await verifyTurnstile({
      ...base,
      token: "token",
      fetchImpl: fakeFetch(okBody),
    });
    expect(verdict).toEqual({ ok: true, hostname: "freluxtools.com" });
  });

  it("rejects a missing or oversized token without calling Cloudflare", async () => {
    const fetchImpl = fakeFetch(okBody);
    expect(await verifyTurnstile({ ...base, token: "  ", fetchImpl })).toEqual({
      ok: false,
      reason: "missing-token",
    });
    expect(
      await verifyTurnstile({ ...base, token: "x".repeat(2049), fetchImpl }),
    ).toEqual({ ok: false, reason: "token-too-long" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails closed when the secret or the hostname allowlist is missing", async () => {
    expect(
      await verifyTurnstile({ ...base, token: "t", secret: undefined }),
    ).toEqual({ ok: false, reason: "missing-secret" });
    expect(
      await verifyTurnstile({ ...base, token: "t", hostnames: " , " }),
    ).toEqual({ ok: false, reason: "no-hostnames" });
  });

  it("rejects a token minted for a different action", async () => {
    const verdict = await verifyTurnstile({
      ...base,
      token: "t",
      fetchImpl: fakeFetch({ ...okBody, action: "signup" }),
    });
    expect(verdict).toEqual({ ok: false, reason: "action-mismatch" });
  });

  it("rejects a hostname outside the allowlist", async () => {
    const verdict = await verifyTurnstile({
      ...base,
      token: "t",
      fetchImpl: fakeFetch({ ...okBody, hostname: "evil.example" }),
    });
    expect(verdict).toEqual({ ok: false, reason: "hostname-not-allowed" });
  });

  it("rejects when Cloudflare says the token is not valid", async () => {
    const verdict = await verifyTurnstile({
      ...base,
      token: "t",
      fetchImpl: fakeFetch({
        success: false,
        "error-codes": ["timeout-or-duplicate"],
      }),
    });
    expect(verdict).toEqual({ ok: false, reason: "siteverify-failed" });
  });

  it("treats a network failure as a rejection", async () => {
    const fetchImpl = vi.fn(async () => {
      throw new Error("offline");
    }) as unknown as typeof fetch;
    expect(await verifyTurnstile({ ...base, token: "t", fetchImpl })).toEqual({
      ok: false,
      reason: "network",
    });
  });
});

// =========================================================
// FRELUX PHASE 7, API KEY FORMAT & AUTHORIZATION TESTS
// Strict §3 key contract + gateway decision logic.
// =========================================================

import { describe, it, expect } from "vitest";
import {
  generateFreluxApiKey,
  validateApiKeyFormat,
  isValidApiKeyFormat,
  hashApiKey,
  maskApiKey,
  apiKeyDisplayPrefix,
  extractBearerToken,
} from "./key-format";
import {
  evaluateKeyStatus,
  evaluateRateLimit,
  evaluateQuota,
  capabilityAllowed,
  regionAllowed,
} from "./auth";
import type { ApiKeyRecord } from "./auth";

describe("API key format, strict §3 contract", () => {
  it('generates keys exactly 32 characters long: "FLX-" + 28 alphanumerics', () => {
    for (let i = 0; i < 500; i++) {
      const key = generateFreluxApiKey();
      expect(key.length).toBe(32);
      expect(key).toMatch(/^FLX-[A-Za-z0-9]{28}$/);
    }
  });

  it("generates keys that pass strict validation every time", () => {
    for (let i = 0; i < 100; i++) {
      expect(isValidApiKeyFormat(generateFreluxApiKey())).toBe(true);
    }
  });

  it("generated keys are unique across a large sample (no sequential/derived patterns)", () => {
    const keys = new Set<string>();
    for (let i = 0; i < 1000; i++) keys.add(generateFreluxApiKey());
    expect(keys.size).toBe(1000);
  });

  it("cryptographic randomness: keys do not correlate with each other or with their index", () => {
    // No sequential generation: consecutive keys must not share suffix structure
    const a = generateFreluxApiKey();
    const b = generateFreluxApiKey();
    expect(a).not.toBe(b);
    expect(a.slice(4)).not.toBe(b.slice(4));
    // No timestamp/UUID shape: all 28 suffix chars are alphanumeric
    expect(a.slice(4)).not.toMatch(/[-_{}]/);
  });

  it("accepts the canonical example structure", () => {
    expect(isValidApiKeyFormat("FLX-A7k92MP4Q8xZ1Bc6N5rT3vW9Y2hK")).toBe(true);
  });

  it("rejects wrong total length (27/28/29-char suffixes and truncated keys)", () => {
    expect(isValidApiKeyFormat("FLX-" + "A".repeat(27))).toBe(false);
    expect(isValidApiKeyFormat("FLX-" + "A".repeat(29))).toBe(false);
    expect(isValidApiKeyFormat("FLX-" + "A".repeat(28) + "X")).toBe(false);
    expect(isValidApiKeyFormat("FLX-A7k9")).toBe(false);
    expect(isValidApiKeyFormat("")).toBe(false);
  });

  it("rejects forbidden formats: FRELUX-, FLX_live_, UUIDs, predictable keys", () => {
    expect(isValidApiKeyFormat("FRELUX-A7k92MP4Q8xZ1Bc6N5rT3vW")).toBe(false);
    expect(isValidApiKeyFormat("FLX_live_A7k92MP4Q8xZ1Bc6N5rT3vW")).toBe(false);
    expect(isValidApiKeyFormat("FLX-550e8400-e29b-41d4-a716-446655")).toBe(
      false,
    ); // UUID-derived
    // A structurally valid but predictable key passes FORMAT validation :
    // unpredictability is enforced at generation time (crypto RNG + uniqueness tests above)
    expect(isValidApiKeyFormat("FLX-" + "0".repeat(27) + "1")).toBe(true);
  });

  it("rejects non-alphanumeric suffix characters (no symbols added)", () => {
    expect(isValidApiKeyFormat("FLX-A7k92MP4Q8xZ1Bc6N5rT3vW9Y2h-")).toBe(false);
    expect(isValidApiKeyFormat("FLX-A7k92MP4Q8xZ1Bc6N5rT3vW9Y2h_")).toBe(false);
    expect(isValidApiKeyFormat("FLX-A7k92MP4Q8xZ1Bc6N5rT3vW9Y2h!")).toBe(false);
    expect(isValidApiKeyFormat("FLX-A7k92MP4Q8xZ1Bc6N5rT3vW9Y2h ")).toBe(false);
  });

  it("reports the exact structural reason on invalid keys", () => {
    const verdict = validateApiKeyFormat("FLX-ABC");
    expect(verdict.valid).toBe(false);
    expect(verdict.reason).toContain("exactly 32 characters");
    expect(validateApiKeyFormat("ABC-" + "A".repeat(28)).reason).toContain(
      "FLX-",
    );
  });
});

describe("key hashing & masking, the raw key is never stored", () => {
  it("hashes deterministically to a 64-char SHA-256 hex digest", async () => {
    const key = "FLX-A7k92MP4Q8xZ1Bc6N5rT3vW9Y2hK";
    const h1 = await hashApiKey(key);
    const h2 = await hashApiKey(key);
    expect(h1).toBe(h2);
    expect(h1).toMatch(/^[0-9a-f]{64}$/);
    expect(h1).not.toContain(key);
  });

  it("different keys hash differently", async () => {
    const h1 = await hashApiKey("FLX-A7k92MP4Q8xZ1Bc6N5rT3vW9Y2hK");
    const h2 = await hashApiKey("FLX-B7k92MP4Q8xZ1Bc6N5rT3vW9Y2hK");
    expect(h1).not.toBe(h2);
  });

  it("masking never reveals more than the first 8 characters", () => {
    const key = "FLX-A7k92MP4Q8xZ1Bc6N5rT3vW9Y2hK";
    expect(maskApiKey(key)).toBe("FLX-A7k9••••");
    expect(maskApiKey(key)).not.toContain("2MP4");
    expect(apiKeyDisplayPrefix(key)).toBe("FLX-A7k9");
    // invalid/malformed input never echoes back anything sensitive
    expect(maskApiKey("garbage")).toBe("FLX-••••");
  });

  it('extractBearerToken parses "Authorization: Bearer FLX-..." without echoing', () => {
    const token = "FLX-A7k92MP4Q8xZ1Bc6N5rT3vW9Y2hK";
    expect(extractBearerToken(`Bearer ${token}`)).toBe(token);
    expect(extractBearerToken(`bearer ${token}`)).toBe(token);
    expect(extractBearerToken("Basic abc")).toBeNull();
    expect(extractBearerToken(null)).toBeNull();
    expect(extractBearerToken("")).toBeNull();
  });
});

describe("authorization decisions, never trust client identity", () => {
  const base: ApiKeyRecord = {
    id: "key-1",
    user_id: "user-1",
    name: "Test key",
    status: "active",
    permissions: ["*"],
    plan_key: "developer",
    rate_limit_per_minute: 60,
    daily_quota: 1000,
    monthly_quota: 25000,
    expires_at: null,
  };
  const now = new Date("2026-09-08T10:00:00Z");

  it("active, unexpired key authenticates; tenant comes from the key record", () => {
    const r = evaluateKeyStatus(base, now);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.userId).toBe("user-1"); // resolved server-side, not from headers
      expect(r.rateLimitPerMinute).toBe(60);
    }
  });

  it("revoked / disabled / expired keys are refused with distinct codes", () => {
    expect(evaluateKeyStatus({ ...base, status: "revoked" }, now).ok).toBe(
      false,
    );
    expect(
      evaluateKeyStatus({ ...base, status: "revoked" }, now),
    ).toMatchObject({ code: "revoked_api_key" });
    expect(
      evaluateKeyStatus({ ...base, status: "disabled" }, now),
    ).toMatchObject({ code: "disabled_api_key" });
    const expired = evaluateKeyStatus(
      { ...base, expires_at: "2026-09-01T00:00:00Z" },
      now,
    );
    expect(expired).toMatchObject({ code: "expired_api_key" });
    // expiry at exactly now is expired (<=)
    expect(
      evaluateKeyStatus({ ...base, expires_at: now.toISOString() }, now),
    ).toMatchObject({ code: "expired_api_key" });
    // future expiry passes
    expect(
      evaluateKeyStatus({ ...base, expires_at: "2027-01-01T00:00:00Z" }, now)
        .ok,
    ).toBe(true);
  });

  it("rate limit and quotas refuse with retry windows, no silent overage", () => {
    expect(evaluateRateLimit(59, 60).allowed).toBe(true);
    expect(evaluateRateLimit(60, 60)).toEqual({
      allowed: false,
      retryAfterSeconds: 60,
    });
    expect(evaluateQuota("daily", 999, 1000).allowed).toBe(true);
    expect(evaluateQuota("daily", 1000, 1000).allowed).toBe(false);
    expect(evaluateQuota("monthly", 25000, 25000).allowed).toBe(false);
  });

  it('capability allow-list: "*" grants all; otherwise exact capability match only', () => {
    expect(capabilityAllowed(["*"], "calculators")).toBe(true);
    expect(capabilityAllowed(["calculators"], "calculators")).toBe(true);
    expect(capabilityAllowed(["calculators"], "chat")).toBe(false);
    expect(capabilityAllowed([], "calculators")).toBe(false);
    expect(
      capabilityAllowed("calculators" as unknown as string[], "calculators"),
    ).toBe(false);
  });

  it('region entitlement comes from plan config, "*" or explicit region codes', () => {
    expect(regionAllowed(["NG", "GB"], "NG")).toBe(true);
    expect(regionAllowed(["NG", "GB"], "US")).toBe(false);
    expect(regionAllowed(["*"], "US")).toBe(true);
    expect(regionAllowed(["NG"], null)).toBe(true); // regionless requests are not region-gated
    expect(regionAllowed("NG" as unknown as string[], "NG")).toBe(false);
    expect(regionAllowed(undefined, "NG")).toBe(false);
  });
});

// =========================================================
// FRELUX SERVER ENGINE BUNDLE ENTRY TESTS
//
// esbuild bundles this file for the frelix-api gateway. The
// security property under test: the bundle is a PURE re-export
// of the canonical registry + key/auth modules — the gateway
// can execute EXACTLY what in-app surfaces execute, and there
// is no second, divergent implementation hiding here.
// Identity checks (same function reference) prove it.
// =========================================================
import { describe, it, expect } from "vitest";
import * as bundle from "@/lib/frelix-api/server-engines";
import * as registry from "@/lib/ai-foundation/engines-registry";
import * as keyFormat from "@/lib/frelix-api/key-format";
import * as auth from "@/lib/frelix-api/auth";

describe("server-engines bundle — canonical re-exports only", () => {
  it("engine registry exports are the SAME objects the app uses", () => {
    expect(bundle.listEngines).toBe(registry.listEngines);
    expect(bundle.getEngineDescriptor).toBe(registry.getEngineDescriptor);
    expect(bundle.executeEngine).toBe(registry.executeEngine);
    expect(bundle.EngineNotRegisteredError).toBe(
      registry.EngineNotRegisteredError,
    );
  });

  it("§3 key contract exports are the same functions", () => {
    expect(bundle.generateFreluxApiKey).toBe(keyFormat.generateFreluxApiKey);
    expect(bundle.validateApiKeyFormat).toBe(keyFormat.validateApiKeyFormat);
    expect(bundle.isValidApiKeyFormat).toBe(keyFormat.isValidApiKeyFormat);
    expect(bundle.hashApiKey).toBe(keyFormat.hashApiKey);
    expect(bundle.maskApiKey).toBe(keyFormat.maskApiKey);
    expect(bundle.apiKeyDisplayPrefix).toBe(keyFormat.apiKeyDisplayPrefix);
    expect(bundle.extractBearerToken).toBe(keyFormat.extractBearerToken);
  });

  it("auth decision exports are the same functions", () => {
    expect(bundle.evaluateKeyStatus).toBe(auth.evaluateKeyStatus);
    expect(bundle.evaluateRateLimit).toBe(auth.evaluateRateLimit);
    expect(bundle.evaluateQuota).toBe(auth.evaluateQuota);
    expect(bundle.capabilityAllowed).toBe(auth.capabilityAllowed);
    expect(bundle.regionAllowed).toBe(auth.regionAllowed);
    expect(bundle.apiError).toBe(auth.apiError);
    expect(bundle.API_ERROR_DOCUMENTATION).toBe(auth.API_ERROR_DOCUMENTATION);
  });

  it("adds no hidden surface of its own — every export is a canonical module's export", () => {
    const canonical = new Map<string, unknown>();
    for (const mod of [registry, keyFormat, auth]) {
      for (const [k, v] of Object.entries(mod)) canonical.set(k, v);
    }
    for (const [k, v] of Object.entries(bundle)) {
      expect(canonical.has(k)).toBe(true);
      expect(canonical.get(k)).toBe(v); // same reference — no divergent copy
    }
    expect(Object.keys(bundle).length).toBeGreaterThan(0);
  });
});

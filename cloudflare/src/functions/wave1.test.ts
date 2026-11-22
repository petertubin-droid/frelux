/**
 * Wave 1 of the Supabase-to-Worker port: health and verify-copy-get run in the
 * Worker itself, and the gateway only falls back to the Supabase proxy for
 * functions that are not in the native registry.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { NATIVE_FUNCTIONS } from "./registry";
import { health } from "./health";
import { verifyCopyGet } from "./verify-copy-get";
import { clientKey, hit } from "./rate-limit";
import type { ApiEnv } from "../api";

const cors = { "access-control-allow-origin": "https://freluxtools.com" };

const env = (overrides: Partial<ApiEnv> = {}): ApiEnv => ({
  SUPABASE_URL: "https://project.supabase.co/",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
  ...overrides,
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const token = "abcdefghijklmnop"; // 16 chars, base32 alphabet

const record = {
  id: "rec-1",
  verification_id: "FLX-2026-0001",
  document_title: "Structural drawings",
  document_reference: "REF-1",
  document_type: "pdf",
  document_hash: "sha256:abc",
  byte_size: 1200,
  status: "anchored",
  created_at: "2026-11-20T10:00:00Z",
  hosted_copy_path: "copies/rec-1.pdf",
  hosted_copy_expires_at: "2999-01-01T00:00:00Z",
  hosted_copy_deleted_at: null,
  blockchain_timestamp_proofs: {
    bitcoin_block_height: 870000,
    bitcoin_block_hash: "00ab",
    verification_status: "confirmed",
  },
};

const verifyRequest = (body: unknown) =>
  new Request("https://files.example/api/fn/verify-copy-get", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("native registry", () => {
  it("registers the wave-1 functions", () => {
    expect(Object.keys(NATIVE_FUNCTIONS).sort()).toEqual([
      "health",
      "verify-copy-get",
    ]);
  });

  it("does not register webhook or AI functions yet", () => {
    for (const name of [
      "paystack-webhook",
      "flutterwave-webhook",
      "btcpay-webhook",
      "ai-copilot",
    ]) {
      expect(NATIVE_FUNCTIONS[name]).toBeUndefined();
    }
  });
});

describe("health (native)", () => {
  it("reports healthy when the database probe succeeds", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([{ id: 1 }])),
    );
    const res = await health(new Request("https://files.example/api/fn/health"), env(), new URL("https://files.example/api/fn/health"), cors);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      checks: { database: string };
    };
    expect(body.status).toBe("healthy");
    expect(body.checks.database).toBe("up");
  });

  it("reports degraded when the database probe fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ message: "nope" }, 401)),
    );
    const res = await health(new Request("https://files.example/api/fn/health"), env(), new URL("https://files.example/api/fn/health"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      checks: { database: string };
    };
    expect(body.status).toBe("degraded");
    expect(body.checks.database).toBe("down");
  });

  it("says unknown rather than down when no service key is configured", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const res = await health(
      new Request("https://files.example/api/fn/health"),
      env({ SUPABASE_SERVICE_ROLE_KEY: undefined }),
      new URL("https://files.example/api/fn/health"),
    );
    const body = (await res.json()) as {
      status: string;
      checks: { database: string };
    };
    expect(body.status).toBe("healthy");
    expect(body.checks.database).toBe("unknown");
  });

  it("rejects non-GET methods", async () => {
    const res = await health(
      new Request("https://files.example/api/fn/health", { method: "POST" }),
      env(),
      new URL("https://files.example/api/fn/health"),
    );
    expect(res.status).toBe(405);
  });
});

describe("verify-copy-get (native)", () => {
  it("returns the signed copy URL and proof", async () => {
    const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
      const target = String(input);
      if (target.includes("/rest/v1/blockchain_document_records")) {
        return jsonResponse([record]);
      }
      if (target.includes("/storage/v1/object/sign/")) {
        return jsonResponse({ signedURL: "/object/sign/verify-copies/copies%2Frec-1.pdf?token=t" });
      }
      throw new Error(`unexpected fetch ${target}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await verifyCopyGet(verifyRequest({ token }), env(), new URL("https://files.example/api/fn/verify-copy-get"), cors);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      available: boolean;
      url: string;
      document: { verification_id: string };
      proof: { bitcoin_block_height: number };
    };
    expect(body.available).toBe(true);
    expect(body.url).toBe(
      "https://project.supabase.co/storage/v1/object/sign/verify-copies/copies%2Frec-1.pdf?token=t",
    );
    expect(body.document.verification_id).toBe("FLX-2026-0001");
    expect(body.proof.bitcoin_block_height).toBe(870000);
  });

  it("lazily purges an expired copy and still returns the fingerprint", async () => {
    const expiredRecord = {
      ...record,
      hosted_copy_expires_at: "2020-01-01T00:00:00Z",
    };
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const target = String(input);
        calls.push(`${init?.method ?? "GET"} ${target}`);
        if (target.includes("/rest/v1/blockchain_document_records?select=")) {
          return jsonResponse([expiredRecord]);
        }
        return jsonResponse({});
      }),
    );

    const res = await verifyCopyGet(verifyRequest({ token }), env(), new URL("https://files.example/api/fn/verify-copy-get"));
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      available: boolean;
      reason: string;
      document: { verification_id: string };
    };
    expect(body.available).toBe(false);
    expect(body.reason).toBe("expired");
    expect(body.document.verification_id).toBe("FLX-2026-0001");
    expect(calls.some((c) => c.startsWith("DELETE https://project.supabase.co/storage/v1/object/verify-copies"))).toBe(true);
    expect(calls.some((c) => c.startsWith("PATCH "))).toBe(true);
  });

  it("returns not_found for an unknown token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse([])),
    );
    const res = await verifyCopyGet(verifyRequest({ token }), env(), new URL("https://files.example/api/fn/verify-copy-get"));
    expect(res.status).toBe(404);
    const body = (await res.json()) as { reason: string };
    expect(body.reason).toBe("not_found");
  });

  it("rejects malformed tokens before any lookup", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const res = await verifyCopyGet(verifyRequest({ token: "not a token" }), env(), new URL("https://files.example/api/fn/verify-copy-get"));
    expect(res.status).toBe(400);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-POST methods", async () => {
    const res = await verifyCopyGet(
      new Request("https://files.example/api/fn/verify-copy-get"),
      env(),
      new URL("https://files.example/api/fn/verify-copy-get"),
    );
    expect(res.status).toBe(405);
  });

  it("fails closed when the service key is missing", async () => {
    const res = await verifyCopyGet(
      verifyRequest({ token }),
      env({ SUPABASE_SERVICE_ROLE_KEY: undefined }),
      new URL("https://files.example/api/fn/verify-copy-get"),
    );
    expect(res.status).toBe(503);
  });
});

describe("rate limit helper", () => {
  it("keys authenticated calls on the JWT subject", () => {
    const payload = Buffer.from(JSON.stringify({ sub: "user-123" })).toString(
      "base64url",
    );
    const req = new Request("https://files.example/x", {
      headers: { authorization: `Bearer header.${payload}.sig` },
    });
    expect(clientKey(req, "verify")).toBe("verify:user:user-123");
  });

  it("keys anonymous calls on the Cloudflare client IP", () => {
    const req = new Request("https://files.example/x", {
      headers: { "cf-connecting-ip": "203.0.113.9" },
    });
    expect(clientKey(req, "verify")).toBe("verify:ip:203.0.113.9");
  });

  it("degrades to open when no Cache API is available", async () => {
    const result = await hit("k", { maxRequests: 1, windowMs: 60_000 });
    expect(result.allowed).toBe(true);
  });
});

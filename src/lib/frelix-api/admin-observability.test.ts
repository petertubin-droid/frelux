// =========================================================
// FRELUX PHASE 7 §23, ADMIN OBSERVABILITY TESTS
// Verifies the aggregate layer: window stats, capability
// aggregation, suspicious-activity heuristics and overview
// composition. No key material is ever read or stored.
// =========================================================

import { describe, it, expect, vi, beforeEach } from "vitest";

const supabaseMock = vi.hoisted(() => {
  // Shape-aware chain: each query records its select arg + filter
  // signature; when awaited, it resolves the configured response.
  const responses = new Map<string, unknown>();
  const missing: string[] = [];
  const keyOf = (sel: string, sig: string[] | string) =>
    `${sel}|${Array.isArray(sig) ? sig.join(",") : sig}`;

  const makeChain = () => {
    let sel = "";
    const sig: string[] = [];
    const chain: Record<string, unknown> = {};
    const filter = (name: string) =>
      vi.fn((...args: unknown[]) => {
        sig.push(`${name}:${args.join("=")}`);
        return chain;
      });
    chain.select = vi.fn((arg: string) => {
      sel = arg;
      return chain;
    });
    for (const f of ["gte", "gt", "eq", "neq", "lt", "in", "not"]) {
      chain[f] = filter(f);
    }
    chain.order = vi.fn(() => chain);
    chain.limit = vi.fn(() => chain);
    // Thenable, resolves at await time with the shape's response.
    // Time-varying (gte:created_at) and list (in:id) filters are
    // normalized out of the lookup key.
    const norm = (list: string[]) =>
      list.filter(
        (e) => !e.startsWith("gte:created_at=") && !e.startsWith("in:id="),
      );
    chain.then = (
      resolve: (v: unknown) => unknown,
      reject: (e: unknown) => unknown,
    ) => {
      const k = keyOf(sel, norm(sig));
      if (!responses.has(k)) missing.push(k);
      const v = responses.get(k);
      return Promise.resolve(v ?? { data: [], count: 0, error: null }).then(
        resolve,
        reject,
      );
    };
    return chain;
  };

  return {
    // Registration API: a single pre-joined lookup key.
    __respond: (key: string, value: unknown) => {
      responses.set(key, value);
    },
    __clear: () => {
      responses.clear();
      missing.length = 0;
    },
    from: vi.fn(() => makeChain()),
    __missing: () => missing,
  };
});

vi.mock("@/lib/supabase", () => ({ supabase: supabaseMock }));

beforeEach(() => {
  vi.clearAllMocks();
  (supabaseMock as unknown as { __clear: () => void }).__clear();
});

import {
  getWindowStats,
  getByCapability,
  getTopKeys,
  getAuthFailures,
  isSuspicious,
  getApiUsageOverview,
} from "./admin-observability";

const TOTAL: [string, { count: number }] = ["id|", { count: 500 }];
const BILLABLE: [string, { count: number }] = [
  "id|gt:usage_units=0",
  { count: 480 },
];
const ERRORS: [string, { count: number }] = [
  "id|gte:status_code=400",
  { count: 12 },
];
const QUOTA: [string, { count: number }] = [
  "id|eq:status_code=429",
  { count: 3 },
];
const AUTH: [string, { count: number }] = [
  "id|eq:status_code=401",
  { count: 2 },
];
const FORBIDDEN: [string, { count: number }] = [
  "id|eq:status_code=403",
  { count: 1 },
];
const LATENCY: [string, { data: { latency_ms: number }[] }] = [
  "latency_ms|gte:created_at=…|gt:usage_units=0",
  { data: [{ latency_ms: 100 }, { latency_ms: 300 }] },
];

describe("getWindowStats", () => {
  it("aggregates counts, denial breakdown and average latency", async () => {
    supabaseMock.__respond(TOTAL[0], TOTAL[1]);
    supabaseMock.__respond(BILLABLE[0], BILLABLE[1]);
    supabaseMock.__respond(ERRORS[0], ERRORS[1]);
    supabaseMock.__respond(QUOTA[0], QUOTA[1]);
    supabaseMock.__respond(AUTH[0], AUTH[1]);
    supabaseMock.__respond(FORBIDDEN[0], FORBIDDEN[1]);
    // latency query: normalized shape (gte:created_at dropped)
    supabaseMock.__respond("latency_ms|gt:usage_units=0", {
      data: [{ latency_ms: 100 }, { latency_ms: 300 }],
    });

    const stats = await getWindowStats(1);
    expect(stats.totalRequests).toBe(500);
    expect(stats.billableRequests).toBe(480);
    expect(stats.errorResponses).toBe(12);
    expect(stats.avgLatencyMs).toBe(200);
    expect(stats.quotaExhausted).toBe(3);
    expect(stats.authFailures).toBe(2);
    expect(stats.permissionDenials).toBe(1);
  });

  it("degrades safely when queries fail or return nothing", async () => {
    const stats = await getWindowStats(1);
    expect(stats.totalRequests).toBe(0);
    expect(stats.billableRequests).toBe(0);
    expect(stats.avgLatencyMs).toBe(0);
  });
});

describe("getByCapability", () => {
  it("aggregates requests, errors and latency per capability, sorted by volume", async () => {
    supabaseMock.__respond("capability, status_code, latency_ms|", {
      data: [
        { capability: "calculators", status_code: 200, latency_ms: 100 },
        { capability: "calculators", status_code: 500, latency_ms: 300 },
        { capability: "market", status_code: 200, latency_ms: 50 },
      ],
    });
    const rows = await getByCapability(1);
    expect(rows[0]).toMatchObject({
      capability: "calculators",
      requests: 2,
      errors: 1,
      avgLatencyMs: 200,
    });
    expect(rows[1]).toMatchObject({ capability: "market", requests: 1 });
  });
});

describe("getAuthFailures", () => {
  it("breaks auth failures down by error code, highest first", async () => {
    supabaseMock.__respond("error_code|eq:status_code=401", {
      data: [
        { error_code: "invalid_api_key" },
        { error_code: "invalid_api_key" },
        { error_code: "expired_api_key" },
      ],
    });
    const rows = await getAuthFailures(1);
    expect(rows[0]).toEqual({ errorCode: "invalid_api_key", count: 2 });
    expect(rows[1]).toEqual({ errorCode: "expired_api_key", count: 1 });
  });
});

describe("isSuspicious", () => {
  const base = {
    totalRequests: 100,
    billableRequests: 50,
    errorResponses: 0,
    avgLatencyMs: 0,
    quotaExhausted: 0,
    authFailures: 0,
    permissionDenials: 0,
  };

  it("flags an invalid-key burst larger than billable traffic", () => {
    expect(
      isSuspicious(base, [{ errorCode: "invalid_api_key", count: 60 }]),
    ).toBe(true);
  });

  it("ignores a small number of honest typos", () => {
    expect(
      isSuspicious(base, [{ errorCode: "invalid_api_key", count: 3 }]),
    ).toBe(false);
  });

  it("flags quota-exhaustion storms", () => {
    expect(isSuspicious({ ...base, quotaExhausted: 250 }, [])).toBe(true);
  });
});

describe("getTopKeys", () => {
  it("joins top usage with masked key metadata (never a hash)", async () => {
    supabaseMock.__respond("api_key_id, status_code|not:api_key_id=is=", {
      data: [
        { api_key_id: "k1", status_code: 200 },
        { api_key_id: "k1", status_code: 429 },
        { api_key_id: "k2", status_code: 200 },
      ],
    });
    supabaseMock.__respond("id, name, key_prefix, status|", {
      data: [
        {
          id: "k1",
          name: "Prod key",
          key_prefix: "FLX-Aaaa",
          status: "active",
        },
      ],
    });
    const rows = await getTopKeys(1);
    expect(rows[0]).toMatchObject({
      keyId: "k1",
      keyName: "Prod key",
      keyPrefix: "FLX-Aaaa",
      requests: 2,
      errors: 1,
    });
    expect(rows[1]).toMatchObject({ keyId: "k2", requests: 1 });
    // Metadata queries must never request the hash.
    expect(JSON.stringify(rows)).not.toContain("key_hash");
  });
});

describe("getApiUsageOverview", () => {
  it("composes window, capabilities, keys, auth failures and suspicion", async () => {
    const o = await getApiUsageOverview(1);
    expect(o.window).toBeDefined();
    expect(Array.isArray(o.byCapability)).toBe(true);
    expect(Array.isArray(o.topKeys)).toBe(true);
    expect(Array.isArray(o.authFailures)).toBe(true);
    expect(typeof o.suspicious).toBe("boolean");
    expect(typeof o.generatedAt).toBe("string");
  });
});

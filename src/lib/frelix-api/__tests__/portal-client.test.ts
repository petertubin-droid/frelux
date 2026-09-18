// =========================================================
// FRELUX API PORTAL CLIENT TESTS (Phase 7)
//
// The §3 key contract at the client:
//   * create/rotate return the raw key EXACTLY ONCE, store
//     only SHA-256 hash + display prefix
//   * key_hash is never in the selected display columns
//   * the client cannot influence plan prices — checkout only
//     starts a payment session with the plan KEY
//   * usage summaries aggregate honestly from raw rows
// =========================================================
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(),
    functions: { invoke: vi.fn() },
    auth: { getSession: vi.fn() },
  },
}));

import { supabase } from "@/lib/supabase";
import {
  listApiKeys,
  createApiKey,
  revokeApiKey,
  restoreApiKey,
  rotateApiKey,
  updateApiKeyLimits,
  getUsageSummary,
  getPlans,
  initializeApiPlanCheckout,
} from "@/lib/frelix-api/portal-client";
import {
  validateApiKeyFormat,
  API_KEY_PREFIX,
  apiKeyDisplayPrefix,
} from "@/lib/frelix-api/key-format";

const from = supabase.from as ReturnType<typeof vi.fn>;

function chain(
  result: { data?: unknown; error?: { message: string } | null } = {},
) {
  // Thenable query builder: the client awaits whatever chain-end it
  // reaches, so every method returns the same thenable.
  const captured: Record<string, unknown> = {};
  const outcome = () =>
    Promise.resolve({ data: result.data ?? [], error: result.error ?? null });
  const q: Record<string, unknown> = {
    select: (cols?: string) => {
      captured.select = cols;
      return q;
    },
    order: () => q,
    eq: (_c: string, _v: unknown) => q,
    gte: () => q,
    limit: () => q,
    insert: (row: Record<string, unknown>) => {
      captured.insert = row;
      return {
        select: () => ({
          single: () =>
            Promise.resolve({
              data: result.data ?? null,
              error: result.error ?? null,
            }),
        }),
      };
    },
    update: (row: Record<string, unknown>) => {
      captured.update = row;
      // .eq() terminates some chains (revoke/restore/limits) and
      // continues with .select().single() in rotate — support both.
      const eqResult = {
        select: () => ({
          single: () =>
            Promise.resolve({
              data: result.data ?? null,
              error: result.error ?? null,
            }),
        }),
        then: (
          onFulfilled: (v: {
            data: unknown;
            error: { message: string } | null;
          }) => unknown,
        ) => outcome().then(onFulfilled),
      };
      return { eq: () => eqResult };
    },
    then: (
      onFulfilled: (v: {
        data: unknown;
        error: { message: string } | null;
      }) => unknown,
    ) => outcome().then(onFulfilled),
  };
  return Object.assign(q, { __captured: captured });
}

beforeEach(() => {
  from.mockReset();
  vi.mocked(supabase.auth.getSession).mockReset();
});

const ROW = {
  id: "k1",
  name: "prod",
  key_prefix: "FLX-ABCD",
  status: "active",
  permissions: ["*"],
  plan_key: "free",
  rate_limit_per_minute: 60,
  daily_quota: 1000,
  monthly_quota: 30000,
  expires_at: null,
  last_used_at: null,
  created_at: "2026-09-01T00:00:00Z",
  updated_at: "2026-09-01T00:00:00Z",
};

describe("listApiKeys", () => {
  it("selects display columns ONLY — key_hash never leaves the database", async () => {
    from.mockReturnValue(chain({ data: [ROW] }));
    const keys = await listApiKeys();
    expect(keys[0].id).toBe("k1");
    const q = from.mock.results[0].value as {
      __captured: Record<string, string>;
    };
    expect(q.__captured.select).not.toContain("key_hash");
    expect(q.__captured.select).toContain("key_prefix");
  });

  it("coerces non-array permissions to [] and rethrows DB errors", async () => {
    from.mockReturnValue(chain({ data: [{ ...ROW, permissions: "weird" }] }));
    expect((await listApiKeys())[0].permissions).toEqual([]);
    from.mockReturnValue(chain({ error: { message: "RLS" } }));
    await expect(listApiKeys()).rejects.toThrow("RLS");
  });
});

describe("createApiKey", () => {
  it("returns a valid raw key exactly once; only hash + prefix are stored", async () => {
    from.mockReturnValue(chain({ data: ROW }));
    const created = await createApiKey("  Prod key  ", "starter", [
      "read:estimates",
    ]);
    expect(created.rawKey.startsWith(API_KEY_PREFIX)).toBe(true);
    expect(validateApiKeyFormat(created.rawKey).valid).toBe(true);
    const q = from.mock.results[0].value as {
      __captured: { insert: Record<string, unknown> };
    };
    expect(q.__captured.insert.name).toBe("Prod key"); // trimmed
    expect(q.__captured.insert.key_prefix).toBe(
      apiKeyDisplayPrefix(created.rawKey),
    ); // derived from THIS key
    expect(String(q.__captured.insert.key_hash)).not.toContain(created.rawKey); // hash only
    expect(created.row.id).toBe("k1");
  });

  it.each([
    ["", "empty"],
    [" ".repeat(101), "over-long"],
  ])("rejects a %s name before any write", async (name) => {
    await expect(createApiKey(name)).rejects.toThrow("1–100");
    expect(from).not.toHaveBeenCalled();
  });
});

describe("revoke / restore / updateLimits", () => {
  it("revoke writes status revoked keyed by id", async () => {
    const q = chain();
    from.mockReturnValue(q);
    await revokeApiKey("k1");
    expect(
      (q as { __captured: { update: Record<string, unknown> } }).__captured
        .update,
    ).toEqual({ status: "revoked" });
  });

  it("restore writes status active keyed by id", async () => {
    const q = chain();
    from.mockReturnValue(q);
    await restoreApiKey("k1");
    expect(
      (q as { __captured: { update: Record<string, unknown> } }).__captured
        .update,
    ).toEqual({ status: "active" });
  });

  it("updateApiKeyLimits passes the patch through unchanged", async () => {
    const q = chain();
    from.mockReturnValue(q);
    await updateApiKeyLimits("k1", { daily_quota: 500 });
    expect(
      (q as { __captured: { update: Record<string, unknown> } }).__captured
        .update,
    ).toEqual({ daily_quota: 500 });
  });

  it("failures throw honestly", async () => {
    from.mockReturnValue(chain({ error: { message: "nope" } }));
    await expect(revokeApiKey("k1")).rejects.toThrow("nope");
  });
});

describe("rotateApiKey", () => {
  it("issues a NEW raw key, reactivates, and returns it exactly once", async () => {
    const q = chain({ data: ROW });
    from.mockReturnValue(q);
    const res = await rotateApiKey("k1");
    expect(validateApiKeyFormat(res.rawKey).valid).toBe(true);
    const upd = (q as { __captured: { update: Record<string, unknown> } })
      .__captured.update;
    expect(upd.status).toBe("active");
    expect(String(upd.key_hash)).not.toContain(res.rawKey);
  });

  it("rotation failures are honest errors", async () => {
    from.mockReturnValue(chain({ error: { message: "gone" } }));
    await expect(rotateApiKey("k1")).rejects.toThrow("gone"); // server message propagates verbatim
  });
});

describe("getUsageSummary", () => {
  it("aggregates today / month / per-key / status codes from raw rows", async () => {
    const now = new Date();
    const iso = (h: number) =>
      new Date(now.getTime() - h * 3_600_000).toISOString();
    from.mockReturnValue(
      chain({
        data: [
          { api_key_id: "k1", status_code: 200, created_at: iso(1) }, // today
          { api_key_id: "k1", status_code: 200, created_at: iso(2) }, // today
          { api_key_id: "k2", status_code: 429, created_at: iso(48) }, // this month
        ],
      }),
    );
    const s = await getUsageSummary();
    expect(s.thisMonth).toBe(3);
    expect(s.today).toBe(2);
    expect(s.perKeyThisMonth).toEqual({ k1: 2, k2: 1 });
    expect(s.recentStatusCodes).toEqual({ "200": 2, "429": 1 });
  });
});

describe("getPlans", () => {
  it("returns active plans only", async () => {
    const plans = [
      {
        key: "starter",
        name: "Starter",
        config: null,
        active: true,
        sort_order: 1,
      },
    ];
    from.mockReturnValue(chain({ data: plans }));
    expect(await getPlans()).toEqual(plans);
  });
});

describe("initializeApiPlanCheckout", () => {
  it("requires a signed-in session", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: null },
    } as never);
    const res = await initializeApiPlanCheckout("starter");
    expect(res).toEqual({ error: "Sign in to purchase an API plan." });
  });

  it("starts a session with the plan KEY only — price is server-side", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: "u1", email: "x@y.z" } } },
    } as never);
    const invoke = vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { data: { authorization_url: "https://pay/1" } },
      error: null,
    } as never);
    const res = await initializeApiPlanCheckout("starter");
    expect(res).toEqual({ authorization_url: "https://pay/1" });
    const body = (invoke.mock.calls[0][1] as { body: Record<string, unknown> })
      .body;
    expect(body.plan).toBe("starter");
    expect(body.purpose).toBe("api_plan");
    expect(body).not.toHaveProperty("price"); // the client can never set a price
  });

  it("surfaces both transport and function-level errors", async () => {
    vi.mocked(supabase.auth.getSession).mockResolvedValue({
      data: { session: { user: { id: "u1", email: "x@y.z" } } },
    } as never);
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: null,
      error: { message: "gateway down" },
    } as never);
    let res = await initializeApiPlanCheckout("starter");
    expect(res).toEqual({ error: "gateway down" });
    vi.mocked(supabase.functions.invoke).mockResolvedValue({
      data: { error: "plan inactive" },
      error: null,
    } as never);
    res = await initializeApiPlanCheckout("starter");
    expect(res).toEqual({ error: "plan inactive" });
  });
});

// =========================================================
// PROVIDER KEYS LIB TESTS
//
// Contract pinned here:
//   * env var wins over DB (existing deploys unchanged)
//   * client resolution ONLY works for client-visible
//     providers — server keys (Resend) are unresolvable
//     from the browser, mirroring the RLS model
//   * view failures degrade to undefined (callers keep their
//     honest no-key fallbacks)
//   * save enforces provider registry + Resend key format,
//     upserts with masked last4 and client_visible per class
//   * the admin list query never selects key_value
// =========================================================
import { describe, it, expect, beforeEach, vi } from "vitest";

const fromMock = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: { from: (...a: unknown[]) => fromMock(...(a as [])) },
  isSupabaseConfigured: true,
}));

import {
  PROVIDER_REGISTRY,
  getProviderMeta,
  resolveClientProviderKey,
  clearClientProviderKeyCache,
  listIntegrationSecrets,
  saveIntegrationSecret,
  setIntegrationSecretStatus,
} from "./provider-keys";

function chain(result: Promise<unknown>, onSelect?: (fields: string) => void) {
  const self: any = {};
  for (const m of ["eq", "order", "update", "delete", "insert"]) {
    self[m] = vi.fn(() => self);
  }
  self.select = vi.fn((fields: string) => {
    onSelect?.(fields);
    return self;
  });
  self.upsert = vi.fn(() => self);
  self.maybeSingle = vi.fn(() => result);
  self.single = vi.fn(() => result);
  return self;
}

beforeEach(() => {
  fromMock.mockReset();
  clearClientProviderKeyCache();
});

describe("registry", () => {
  it("covers all five providers with honest consumption states", () => {
    expect(PROVIDER_REGISTRY.map((p) => p.id)).toEqual([
      "resend",
      "openweather",
      "web-push-public",
      "web-push-private",
      "open-exchange-rates",
    ]);
    const resend = getProviderMeta("resend");
    expect(resend?.exposure).toBe("server");
    expect(resend?.consumption).toBe("live");
    const oxr = getProviderMeta("open-exchange-rates");
    expect(oxr?.consumption).toBe("slot-ready");
    // VAPID keys: both halves are live push infrastructure.
    expect(getProviderMeta("web-push-public")?.consumption).toBe("live");
    expect(getProviderMeta("web-push-private")?.consumption).toBe("live");
    expect(getProviderMeta("nope")).toBeUndefined();
  });

  it("marks exactly the client-visible keys (OpenWeather, VAPID public)", () => {
    for (const p of PROVIDER_REGISTRY) {
      expect(p.exposure === "client").toBe(
        p.id === "openweather" || p.id === "web-push-public",
      );
    }
  });
});

describe("resolveClientProviderKey", () => {
  it("returns undefined for server-side providers (Resend never client-resolvable)", async () => {
    await expect(resolveClientProviderKey("resend")).resolves.toBeUndefined();
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("resolves a client key from the public view when no env key is set", async () => {
    fromMock.mockImplementation((table: string) => {
      expect(table).toBe("integration_keys_public");
      return chain(
        Promise.resolve({ data: { key_value: "OW-KEY-1234" }, error: null }),
      );
    });
    await expect(resolveClientProviderKey("openweather")).resolves.toBe(
      "OW-KEY-1234",
    );
  });

  it("caches the DB-resolved key (single view query per TTL window)", async () => {
    fromMock.mockImplementation(() =>
      chain(
        Promise.resolve({ data: { key_value: "CACHED-KEY" }, error: null }),
      ),
    );
    await resolveClientProviderKey("openweather");
    await resolveClientProviderKey("openweather");
    expect(fromMock).toHaveBeenCalledTimes(1);
  });

  it("degrades to undefined when the view errors or is empty", async () => {
    fromMock.mockImplementation(() =>
      chain(Promise.resolve({ data: null, error: { message: "boom" } })),
    );
    await expect(
      resolveClientProviderKey("openweather"),
    ).resolves.toBeUndefined();
  });
});

describe("admin helpers", () => {
  it("listIntegrationSecrets never selects key_value", async () => {
    let selected = "";
    fromMock.mockImplementation(() =>
      chain(Promise.resolve({ data: [], error: null }), (f) => {
        selected = f;
      }),
    );
    await listIntegrationSecrets();
    expect(selected).not.toContain("key_value");
    expect(selected).toContain("key_last4");
  });

  it("saveIntegrationSecret rejects unknown providers and malformed Resend keys", async () => {
    await expect(saveIntegrationSecret("nope", "x")).rejects.toThrow(
      /unknown provider/i,
    );
    await expect(
      saveIntegrationSecret("resend", "not-a-resend-key"),
    ).rejects.toThrow(/re_/i);
    expect(fromMock).not.toHaveBeenCalled();
  });

  it("saveIntegrationSecret upserts with last4, client_visible per class, active status", async () => {
    const ch = chain(
      Promise.resolve({
        data: {
          provider_id: "openweather",
          key_last4: "1234",
          status: "active",
          updated_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        },
        error: null,
      }),
    );
    fromMock.mockImplementation((table: string) => {
      expect(table).toBe("integration_secrets");
      return ch;
    });
    const meta = await saveIntegrationSecret("openweather", "  abc1234  ");
    const upsertArg = ch.upsert.mock.calls[0][0] as Record<string, unknown>;
    expect(upsertArg.key_last4).toBe("1234");
    expect(upsertArg.client_visible).toBe(true);
    expect(upsertArg.status).toBe("active");
    expect(meta.key_last4).toBe("1234");
  });

  it("setIntegrationSecretStatus updates status and clears the client cache", async () => {
    fromMock.mockImplementation(() =>
      chain(Promise.resolve({ data: null, error: null })),
    );
    await setIntegrationSecretStatus("openweather", "disabled");
    expect(fromMock).toHaveBeenCalledWith("integration_secrets");
  });
});

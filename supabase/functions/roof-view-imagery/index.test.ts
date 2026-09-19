/* eslint-disable @typescript-eslint/no-explicit-any */
// =========================================================
// roof-view-imagery tests — activation of the formerly-dead
// Roof View feature (audit F3). Covers:
//   - auth gate (401 for anonymous — this proxies a paid provider API)
//   - honest NOT_CONFIGURED when no enabled provider row exists
//   - KEY_MISSING when enabled but the admin key was never stored
//   - location validation (lat/lng required, geocoding not supported)
//   - google_maps / mapbox / custom happy paths (fetch stubbed):
//     key NEVER leaks in the response, data-URL returned, bounds computed
//   - provider errors surface honestly (HTTP status passthrough)
//   - non-image content-type refused, oversized image refused
//   - unimplemented provider (nearmap) self-reports honestly
// =========================================================
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import "./index.ts";
import {
  getHandler,
  givenRows,
  givenUser,
  req,
  json,
  state,
} from "../_shared/testing/harness.ts";

const handler = getHandler();

const USER_AUTH = { Authorization: "Bearer user-jwt" };
const USER_ID = "22222222-2222-4222-8222-222222222222";

const LAGOS = { latitude: 6.5244, longitude: 3.3792 };

function call(
  body: unknown,
  headers: Record<string, string> = USER_AUTH,
): Promise<Response> {
  return handler(req("POST", "", body, headers));
}

function providerRow(overrides: Record<string, unknown> = {}) {
  return {
    provider_type: "google_maps",
    enabled: true,
    api_key_configured: true,
    display_name: "Google Maps Satellite",
    settings: { zoom: 20, size: "640x640" },
    ...overrides,
  };
}

function integrationRow(apiKey: string) {
  return {
    integration_key: "roof_view",
    config: { api_key: "test-provider-key" },
    ...(apiKey ? {} : {}),
  };
}

/** Stub global fetch — serves provider imagery requests. */
function stubFetch(
  impl: (url: string, init?: RequestInit) => Response,
): () => void {
  const orig = (globalThis as any).fetch;
  (globalThis as any).fetch = (input: any, init?: any) => {
    const url =
      typeof input === "string" ? input : (input?.url ?? String(input));
    return Promise.resolve(impl(url, init));
  };
  return () => {
    (globalThis as any).fetch = orig;
  };
}

// 1×1 transparent PNG
const PNG_BYTES = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49,
  0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06,
  0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4, 0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44,
  0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00, 0x05, 0x00, 0x01, 0x0d,
  0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42,
  0x60, 0x82,
]);
const PNG_B64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGMAAQAABQABDQottAAAAABJRU5ErkJggg==";

const restores: Array<() => void> = [];
afterEach(() => {
  restores.forEach((r) => r());
  restores.length = 0;
});

beforeEach(() => {
  givenUser({ id: USER_ID, email: "user@test.local" });
  givenRows("roof_view_config", [providerRow()]);
  givenRows("integration_settings", [integrationRow("x")]);
});

describe("roof-view-imagery — auth gate", () => {
  it("401 for anonymous callers", async () => {
    givenUser(null);
    const res = await call({ location: LAGOS }, {});
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.available).toBe(false);
    expect(body.code).toBe("AUTH_REQUIRED");
  });

  it("405 for GET", async () => {
    const res = await handler(req("GET", "", undefined, USER_AUTH));
    expect(res.status).toBe(405);
  });

  it("400 for invalid JSON", async () => {
    const r = new Request("https://test-project.supabase.co/functions/v1/fn", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...USER_AUTH },
      body: "not json{",
    });
    const res = await handler(r);
    expect(res.status).toBe(400);
  });
});

describe("roof-view-imagery — config honesty", () => {
  it("NOT_CONFIGURED when no enabled provider exists", async () => {
    givenRows("roof_view_config", []);
    const res = await call({ location: LAGOS });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.available).toBe(false);
    expect(body.code).toBe("NOT_CONFIGURED");
    expect(body.error).toMatch(/No imagery provider is configured/);
  });

  it("KEY_MISSING when enabled but api_key_configured is false", async () => {
    givenRows("roof_view_config", [providerRow({ api_key_configured: false })]);
    const res = await call({ location: LAGOS });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.available).toBe(false);
    expect(body.code).toBe("KEY_MISSING");
  });

  it("KEY_MISSING when the integration_settings row has no key", async () => {
    givenRows("integration_settings", []);
    const res = await call({ location: LAGOS });
    const body = await json(res);
    expect(body.available).toBe(false);
    expect(body.code).toBe("KEY_MISSING");
  });

  it("env fallback key works when no integration_settings row exists", async () => {
    givenRows("integration_settings", []);
    state.env.GOOGLE_MAPS_API_KEY = "env-fallback-key";
    restores.push(() => delete state.env.GOOGLE_MAPS_API_KEY);
    let seenUrl = "";
    restores.push(
      stubFetch((url) => {
        seenUrl = url;
        return new Response(PNG_BYTES, {
          headers: { "Content-Type": "image/png" },
        });
      }),
    );
    const res = await call({ location: LAGOS });
    const body = await json(res);
    expect(body.available).toBe(true);
    expect(seenUrl).toContain("key=env-fallback-key");
  });

  it("per-provider integration key (roof_view_google_maps) is honored", async () => {
    givenRows("integration_settings", [
      {
        integration_key: "roof_view_google_maps",
        config: { api_key: "provider-scoped-key" },
      },
    ]);
    let seenUrl = "";
    restores.push(
      stubFetch((url) => {
        seenUrl = url;
        return new Response(PNG_BYTES, {
          headers: { "Content-Type": "image/png" },
        });
      }),
    );
    const res = await call({ location: LAGOS });
    const body = await json(res);
    expect(body.available).toBe(true);
    expect(seenUrl).toContain("key=provider-scoped-key");
  });
});

describe("roof-view-imagery — location validation", () => {
  it("requires lat/lng — no address geocoding", async () => {
    const res = await call({
      location: { address: "Lekki, Lagos" },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.available).toBe(false);
    expect(body.code).toBe("LOCATION_REQUIRED");
    expect(body.error).toMatch(/geocoding is not supported/);
  });

  it("rejects out-of-range coordinates", async () => {
    const res = await call({ location: { latitude: 999, longitude: 3 } });
    const body = await json(res);
    expect(body.available).toBe(false);
    expect(body.code).toBe("LOCATION_REQUIRED");
  });
});

describe("roof-view-imagery — provider happy paths", () => {
  it("google_maps: fetches, returns data URL, key never leaks, bounds present", async () => {
    let seenUrl = "";
    restores.push(
      stubFetch((url) => {
        seenUrl = url;
        return new Response(PNG_BYTES, {
          headers: { "Content-Type": "image/png" },
        });
      }),
    );
    const res = await call({ location: LAGOS });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.available).toBe(true);
    expect(body.imagery_url).toBe(`data:image/png;base64,${PNG_B64}`);
    expect(body.provider).toBe("google_maps");
    expect(body.provider_display_name).toBe("Google Maps Satellite");
    expect(typeof body.retrieved_at).toBe("string");
    // provider URL construction
    expect(seenUrl).toContain("maps.googleapis.com/maps/api/staticmap");
    expect(seenUrl).toContain("center=6.5244,3.3792");
    expect(seenUrl).toContain("zoom=20");
    expect(seenUrl).toContain("size=640x640");
    expect(seenUrl).toContain("key=test-provider-key");
    // bounds are web-mercator around the center
    expect(body.bounds.north).toBeGreaterThan(LAGOS.latitude);
    expect(body.bounds.south).toBeLessThan(LAGOS.latitude);
    expect(body.bounds.east).toBeGreaterThan(LAGOS.longitude);
    expect(body.bounds.west).toBeLessThan(LAGOS.longitude);
    // THE key must never appear anywhere in the response
    const raw = JSON.stringify(body);
    expect(raw).not.toContain("test-provider-key");
    expect(raw).not.toContain("maps.googleapis.com");
  });

  it("mapbox: lng,lat order in tile URL, token never leaks", async () => {
    givenRows("roof_view_config", [
      providerRow({
        provider_type: "mapbox",
        display_name: "Mapbox Satellite",
        settings: { zoom: 19, size: "600x600", high_resolution: false },
      }),
    ]);
    let seenUrl = "";
    restores.push(
      stubFetch((url) => {
        seenUrl = url;
        return new Response(PNG_BYTES, {
          headers: { "Content-Type": "image/png" },
        });
      }),
    );
    const res = await call({ location: LAGOS });
    const body = await json(res);
    expect(body.available).toBe(true);
    expect(body.provider).toBe("mapbox");
    expect(seenUrl).toContain("api.mapbox.com/styles/v1/mapbox/satellite-v9");
    expect(seenUrl).toContain("3.3792,6.5244,19/600x600");
    expect(seenUrl).toContain("access_token=test-provider-key");
    expect(JSON.stringify(body)).not.toContain("test-provider-key");
  });

  it("mapbox @2x when high_resolution is not false", async () => {
    givenRows("roof_view_config", [
      providerRow({
        provider_type: "mapbox",
        settings: { zoom: 19, size: "600x600" },
      }),
    ]);
    let seenUrl = "";
    restores.push(
      stubFetch((url) => {
        seenUrl = url;
        return new Response(PNG_BYTES, {
          headers: { "Content-Type": "image/png" },
        });
      }),
    );
    const res = await call({ location: LAGOS });
    await json(res);
    expect(seenUrl).toContain("@2x/600x600");
  });

  it("custom provider: endpoint templating + custom key header", async () => {
    givenRows("roof_view_config", [
      providerRow({
        provider_type: "custom",
        display_name: "Custom Imagery",
        settings: {
          endpoint_url: "https://img.example.com/{lat}/{lng}?z={zoom}",
          api_key_header: "X-Api-Key",
        },
      }),
    ]);
    let seenUrl = "";
    let seenInit: RequestInit | undefined;
    restores.push(
      stubFetch((url, init) => {
        seenUrl = url;
        seenInit = init;
        return new Response(PNG_BYTES, {
          headers: { "Content-Type": "image/png" },
        });
      }),
    );
    const res = await call({ location: LAGOS });
    const body = await json(res);
    expect(body.available).toBe(true);
    expect(seenUrl).toBe("https://img.example.com/6.5244/3.3792?z=20");
    expect((seenInit?.headers as Record<string, string>)?.["X-Api-Key"]).toBe(
      "test-provider-key",
    );
  });
});

describe("roof-view-imagery — provider failures are honest", () => {
  it("provider HTTP error surfaces with status, no key leakage", async () => {
    restores.push(stubFetch(() => new Response("denied", { status: 403 })));
    const res = await call({ location: LAGOS });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.available).toBe(false);
    expect(body.provider_error).toBe(true);
    expect(body.error).toMatch(/HTTP 403/);
  });

  it("network failure surfaces honestly", async () => {
    restores.push(
      stubFetch(() => {
        throw new Error("network down");
      }),
    );
    const res = await call({ location: LAGOS });
    const body = await json(res);
    expect(body.available).toBe(false);
    expect(body.provider_error).toBe(true);
    expect(body.error).toMatch(/Could not reach/);
  });

  it("non-image content-type is refused", async () => {
    restores.push(
      stubFetch(
        () =>
          new Response(JSON.stringify({ error: "quota" }), {
            headers: { "Content-Type": "application/json" },
          }),
      ),
    );
    const res = await call({ location: LAGOS });
    const body = await json(res);
    expect(body.available).toBe(false);
    expect(body.error).toMatch(/did not return an image/);
  });

  it("oversized image is refused (5MB ceiling)", async () => {
    restores.push(
      stubFetch(
        () =>
          new Response(new Uint8Array(6 * 1024 * 1024), {
            headers: { "Content-Type": "image/png" },
          }),
      ),
    );
    const res = await call({ location: LAGOS });
    const body = await json(res);
    expect(body.available).toBe(false);
    expect(body.error).toMatch(/5 MB ceiling/);
  });

  it("unimplemented provider (nearmap) self-reports honestly", async () => {
    givenRows("roof_view_config", [
      providerRow({
        provider_type: "nearmap",
        display_name: "Nearmap",
      }),
    ]);
    const res = await call({ location: LAGOS });
    const body = await json(res);
    expect(body.available).toBe(false);
    expect(body.error).toMatch(/not implemented yet/);
  });

  it("custom provider without endpoint_url is honest", async () => {
    givenRows("roof_view_config", [
      providerRow({
        provider_type: "custom",
        display_name: "Custom Imagery",
        settings: {},
      }),
    ]);
    const res = await call({ location: LAGOS });
    const body = await json(res);
    expect(body.available).toBe(false);
    expect(body.error).toMatch(/no endpoint_url configured/);
  });
});

describe("roof-view-imagery — rate limiting", () => {
  it("429 after the per-minute ceiling", async () => {
    restores.push(
      stubFetch(
        () =>
          new Response(PNG_BYTES, {
            headers: { "Content-Type": "image/png" },
          }),
      ),
    );
    // GENERAL ceiling is 60/min — exhaust it
    let last: Response | null = null;
    for (let i = 0; i < 61; i++) {
      last = await call({ location: LAGOS });
    }
    expect(last!.status).toBe(429);
    const body = await json(last!);
    expect(body.code).toBe("RATE_LIMITED");
  });
});

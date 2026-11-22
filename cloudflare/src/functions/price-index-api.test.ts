/**
 * Wave 2: price-index-api runs natively and delegates its statistics to the
 * canonical src/lib/price-index/stats.ts implementation instead of a local copy.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { priceIndexApi } from "./price-index-api";
import type { ApiEnv } from "../api";

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

const price = (value: number, extra: Record<string, unknown> = {}) => ({
  ref_id: "mat-1",
  price: value,
  currency: "NGN",
  city_slug: null,
  price_kind: "retail",
  sale_unit: "per bag",
  supplier_name: "Supplier A",
  price_source: "scan",
  effective_date: "2026-11-20",
  verification_status: "verified",
  ...extra,
});

const material = {
  id: "mat-1",
  name: "Cement 50kg",
  slug: "cement-50kg",
  category: "masonry",
};

const call = (query = "", e = env()) =>
  priceIndexApi(
    new Request(`https://files.example/api/fn/price-index-api${query}`),
    e,
    new URL(`https://files.example/api/fn/price-index-api${query}`),
  );

function stub(prices: unknown[], materials: unknown[] = [material]) {
  return vi.fn(async (input: RequestInfo | URL) => {
    const target = String(input);
    if (target.includes("/rest/v1/estimation_prices")) return jsonResponse(prices);
    if (target.includes("/rest/v1/estimation_materials")) return jsonResponse(materials);
    throw new Error(`unexpected fetch ${target}`);
  });
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("price-index-api (native)", () => {
  it("publishes a median once the sample gate is met", async () => {
    vi.stubGlobal("fetch", stub([price(4000), price(5000), price(6000)]));
    const res = await call("?material=cement-50kg&category=masonry");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      ok: boolean;
      market: string;
      materials_with_figure: number;
      items: { status: string; median: number; count: number; currency: string }[];
    };
    expect(body.ok).toBe(true);
    expect(body.market).toBe("NG");
    expect(body.materials_with_figure).toBe(1);
    expect(body.items[0].status).toBe("ok");
    expect(body.items[0].median).toBe(5000);
    expect(body.items[0].count).toBe(3);
  });

  it("withholds a figure below three observations", async () => {
    vi.stubGlobal("fetch", stub([price(4000), price(5000)]));
    const res = await call("?material=cement-50kg");
    const body = (await res.json()) as {
      materials_with_figure: number;
      items: { status: string; required: number; count: number }[];
    };
    expect(body.materials_with_figure).toBe(0);
    expect(body.items[0].status).toBe("insufficient");
    expect(body.items[0].required).toBe(3);
    expect(body.items[0].count).toBe(2);
  });

  it("ignores flagged observations", async () => {
    vi.stubGlobal(
      "fetch",
      stub([
        price(4000),
        price(5000),
        price(900000, { verification_status: "flagged" }),
      ]),
    );
    const res = await call("?material=cement-50kg");
    const body = (await res.json()) as { items: { status: string; count: number }[] };
    expect(body.items[0].status).toBe("insufficient");
    expect(body.items[0].count).toBe(2);
  });

  it("reads the market and currency from the request and rows", async () => {
    vi.stubGlobal("fetch", stub([price(120, { currency: "USD" }), price(130, { currency: "USD" }), price(140, { currency: "USD" })]));
    const res = await call("?market=us&material=cement-50kg");
    const body = (await res.json()) as {
      market: string;
      items: { currency: string }[];
    };
    expect(body.market).toBe("US");
    expect(body.items[0].currency).toBe("USD");
  });

  it("marks a city query as city basis", async () => {
    vi.stubGlobal("fetch", stub([price(4000), price(5000), price(6000)]));
    const res = await call("?city=lagos&material=cement-50kg");
    const body = (await res.json()) as { items: { basis: string; city_slug: string }[] };
    expect(body.items[0].basis).toBe("city");
    expect(body.items[0].city_slug).toBe("lagos");
  });

  it("filters by material slug", async () => {
    vi.stubGlobal("fetch", stub([price(4000), price(5000), price(6000)]));
    const res = await call("?material=not-cement");
    const body = (await res.json()) as { items: unknown[] };
    expect(body.items).toEqual([]);
  });

  it("serves a repeat query from the module cache", async () => {
    const fetchMock = stub([price(4000), price(5000), price(6000)]);
    vi.stubGlobal("fetch", fetchMock);
    await call("?material=cement-50kg&category=masonry");
    const calls = fetchMock.mock.calls.length;
    const res = await call("?material=cement-50kg&category=masonry");
    expect(res.headers.get("x-cache")).toBe("hit");
    expect(fetchMock.mock.calls.length).toBe(calls);
  });

  it("rejects non-GET and fails closed without a service key", async () => {
    const post = await priceIndexApi(
      new Request("https://files.example/api/fn/price-index-api", { method: "POST" }),
      env(),
      new URL("https://files.example/api/fn/price-index-api"),
    );
    expect(post.status).toBe(405);

    const noKey = await call("", env({ SUPABASE_SERVICE_ROLE_KEY: undefined }));
    expect(noKey.status).toBe(500);
  });
});

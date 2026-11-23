/**
 * Wave 3: sitemap runs natively with the same URL inventory, trailing-slash
 * canonicalisation and doorway-page guard as the Supabase function.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __resetSitemapCache,
  canonicalizeLocs,
  escapeXml,
  sitemap,
} from "./sitemap";
import type { ApiEnv } from "../api";

const env = (overrides: Partial<ApiEnv> = {}): ApiEnv => ({
  SUPABASE_URL: "https://project.supabase.co/",
  SUPABASE_SERVICE_ROLE_KEY: "service-key",
  ...overrides,
});

const rows = (body: unknown[]) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "content-type": "application/json" },
  });

const stub = (tables: Record<string, unknown[]>) =>
  vi.fn(async (input: RequestInfo | URL) => {
    const target = String(input);
    for (const [table, body] of Object.entries(tables)) {
      if (target.includes(`/rest/v1/${table}?`)) return rows(body);
    }
    return rows([]);
  });

const call = (e = env()) =>
  sitemap(
    new Request("https://files.example/api/fn/sitemap"),
    e,
    new URL("https://files.example/api/fn/sitemap"),
  );

afterEach(() => {
  vi.unstubAllGlobals();
  __resetSitemapCache();
});

describe("sitemap helpers", () => {
  it("canonicalises page URLs to trailing slash and leaves files alone", () => {
    const xml =
      "<loc>https://freluxtools.com/paint-calculator</loc><loc>https://freluxtools.com/sitemap.xml</loc><loc>https://freluxtools.com/a?x=1</loc>";
    const out = canonicalizeLocs(xml);
    expect(out).toContain("<loc>https://freluxtools.com/paint-calculator/</loc>");
    expect(out).toContain("<loc>https://freluxtools.com/sitemap.xml</loc>");
    expect(out).toContain("<loc>https://freluxtools.com/a/?x=1</loc>");
  });

  it("escapes XML entities", () => {
    expect(escapeXml("a&b<c>d\"e'f")).toBe("a&amp;b&lt;c&gt;d&quot;e&apos;f");
  });
});

describe("sitemap (native)", () => {
  it("emits static routes and live inventory in canonical form", async () => {
    vi.stubGlobal(
      "fetch",
      stub({
        paint_colors: [{ slug: "ivory-white", updated_at: "2026-11-01T10:00:00Z" }],
        color_combinations: [{ slug: "warm-pair", updated_at: "2026-11-02T10:00:00Z" }],
        learn_articles: [
          { slug: "how-much-paint", updated_at: "2026-11-03T10:00:00Z", published_at: "2026-11-03T10:00:00Z" },
        ],
        learn_categories: [{ slug: "painting" }],
        calculator_templates: [{ slug: "standard-living-room-painting", updated_at: "2026-11-04T10:00:00Z" }],
      }),
    );
    const res = await call();
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("xml");
    const xml = await res.text();
    expect(xml).toContain("https://freluxtools.com/paint-calculator/");
    expect(xml).toContain("https://freluxtools.com/colors/paint/ivory-white/");
    expect(xml).toContain("<lastmod>2026-11-01</lastmod>");
    expect(xml).toContain("https://freluxtools.com/learn/how-much-paint/");
    expect(xml).toContain("https://freluxtools.com/templates/standard-living-room-painting/");
  });

  it("skips non-indexable profiles and listings", async () => {
    vi.stubGlobal(
      "fetch",
      stub({
        pro_profiles: [
          { slug: "indexable-pro", updated_at: "2026-11-01T10:00:00Z", seo_indexable: true },
          { slug: "hidden-pro", updated_at: "2026-11-01T10:00:00Z", seo_indexable: false },
        ],
        marketplace_listings: [
          { id: "listing-1", updated_at: "2026-11-01T10:00:00Z", seo_indexable: true },
          { id: "listing-2", updated_at: "2026-11-01T10:00:00Z", seo_indexable: false },
        ],
      }),
    );
    const xml = await (await call()).text();
    expect(xml).toContain("/pro-connect/indexable-pro/");
    expect(xml).not.toContain("hidden-pro");
    expect(xml).toContain("/marketplace/listing-1/");
    expect(xml).not.toContain("listing-2");
  });

  it("emits no programmatic matrix pages without inventory", async () => {
    vi.stubGlobal(
      "fetch",
      stub({
        pro_categories: [{ id: "c1", slug: "painters", name: "Painters", seo_indexable: true }],
        pro_locations: [{ id: "l1", slug: "lagos", state: "Lagos", city: "Ikeja", seo_indexable: true }],
      }),
    );
    const xml = await (await call()).text();
    expect(xml).toContain("/marketplace/category/painters/");
    expect(xml).toContain("/marketplace/sellers/lagos/");
    expect(xml).not.toContain("/pro/painters/lagos/");
  });

  it("keeps translations additive and never fails the file", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const target = String(input);
        if (target.includes("content_translations")) throw new Error("offline");
        return rows([]);
      }),
    );
    const res = await call();
    expect(res.status).toBe(200);
  });

  it("fails closed without a service key", async () => {
    const res = await call(env({ SUPABASE_SERVICE_ROLE_KEY: undefined }));
    expect(res.status).toBe(500);
  });
});

/**
 * Sitemap coverage contract (2026-10-29 audit).
 *
 * Google Search Console can only crawl what /sitemap.xml lists. This test runs
 * the real Netlify sitemap function against a stubbed Supabase REST layer and
 * pins the URL families that were missing or broken before the audit:
 *
 *  - /global-markets/ (public page, previously never listed)
 *  - /pro/<category>/<city>/ (pro directory SEO pages)
 *  - /case-studies/<id>/ (published case studies only)
 *  - /marketplace/category|sellers|category/city|<listing>/ and /products/<id>/
 *  - /pro-connect/<slug>/ (this query previously filtered a non-existent
 *    `is_active` column, so the whole family silently disappeared)
 *
 * The stub answers every REST path with its table's rows regardless of query
 * strings: the assertions describe what the generator emits for a populated
 * database. A 400/empty response in production silently empties a family,
 * which is exactly the failure mode this test exists to catch.
 */
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

const ROOT = process.cwd();

const ROWS: Record<string, unknown[]> = {
  learn_articles: [
    {
      slug: "secure-attachment",
      published_at: "2026-10-01",
      category_slug: "communication",
    },
  ],
  learn_categories: [{ slug: "communication" }],
  content_translations: [],
  paint_colors: [{ slug: "ivory", updated_at: "2026-10-02" }],
  color_combinations: [],
  calculator_templates: [],
  pro_categories: [{ id: "cat-1", slug: "plumbing" }],
  pro_locations: [{ id: "loc-1", city: "Lagos" }],
  pro_profiles: [
    {
      id: "pro-1",
      category_id: "cat-1",
      slug: "acme-plumbing",
      updated_at: "2026-10-03",
    },
  ],
  pro_profile_locations: [{ profile_id: "pro-1", location_id: "loc-1" }],
  case_studies: [
    { id: "cs-1", published_at: "2026-10-04", gallery_entry_id: "g-1" },
  ],
  gallery_entries: [{ id: "g-1", status: "approved", is_public: true }],
  marketplace_listings: [
    {
      id: "listing-1",
      category_id: "cat-1",
      location_city: "Lagos",
      updated_at: "2026-10-05",
    },
  ],
  marketplace_products: [{ id: "product-1", updated_at: "2026-10-06" }],
};

let urls: string[];

beforeAll(async () => {
  process.env.VITE_SUPABASE_URL = "https://mock.supabase.co";
  process.env.VITE_SUPABASE_ANON_KEY = "test-anon-key";
  process.env.SITE_URL = "https://freluxtools.com";

  // The shared test setup replaces global fetch with an inert stub, so this
  // suite installs its own table-aware stub for the duration of the run.
  vi.stubGlobal("fetch", async (input: RequestInfo | URL) => {
    const url = typeof input === "string" ? input : String(input);
    const table = url.match(/\/rest\/v1\/([a-z_]+)/)?.[1] ?? "";
    return new Response(JSON.stringify(ROWS[table] ?? []), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  });

  const mod = (await import(join(ROOT, "netlify/functions/sitemap.js"))) as {
    handler: () => Promise<{ statusCode: number; body: string }>;
  };
  const result = await mod.handler();
  expect(result.statusCode).toBe(200);
  expect(result.body).toContain("http://www.sitemaps.org/schemas/sitemap/0.9");
  urls = [...result.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
});

afterAll(() => {
  vi.unstubAllGlobals();
});

const has = (suffix: string) => urls.some((u) => u.endsWith(suffix));

describe("sitemap coverage", () => {
  it("lists the global markets index", () => {
    expect(has("/global-markets/")).toBe(true);
  });

  it("lists market landing pages and calculator templates", () => {
    expect(has("/market/us/")).toBe(true);
    expect(has("/templates/")).toBe(true);
  });

  it("lists pro directory category x location pages", () => {
    expect(has("/pro/plumbing/lagos/")).toBe(true);
  });

  it("lists published case study detail pages", () => {
    expect(has("/case-studies/cs-1/")).toBe(true);
  });

  it("lists marketplace category, seller-city and category x city pages", () => {
    expect(has("/marketplace/category/plumbing/")).toBe(true);
    expect(has("/marketplace/sellers/lagos/")).toBe(true);
    expect(has("/marketplace/plumbing/lagos/")).toBe(true);
  });

  it("lists marketplace listing and product detail pages", () => {
    expect(has("/marketplace/listing-1/")).toBe(true);
    expect(has("/marketplace/products/product-1/")).toBe(true);
  });

  it("lists pro profiles (regression: non-existent is_active column emptied this family)", () => {
    expect(has("/pro-connect/acme-plumbing/")).toBe(true);
  });

  it("lists learn articles and paint colors", () => {
    expect(has("/learn/secure-attachment/")).toBe(true);
    expect(has("/colors/paint/ivory/")).toBe(true);
  });

  it("emits only canonical absolute URLs with no query strings", () => {
    expect(urls.length).toBeGreaterThan(150);
    expect(urls.every((u) => u.startsWith("https://freluxtools.com/"))).toBe(
      true,
    );
    expect(urls.every((u) => !u.includes("?"))).toBe(true);
  });
});

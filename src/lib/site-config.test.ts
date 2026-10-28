import { describe, expect, it } from "vitest";
import {
  DEFAULT_SITE_URL,
  normalizeOrigin,
  siteUrl,
  SITE_HOST,
  SITE_URL,
} from "@/lib/site-config";

describe("site-config", () => {
  it("resolves an absolute origin without a trailing slash", () => {
    expect(SITE_URL).toMatch(/^https:\/\/[^/]+$/);
    expect(SITE_URL.endsWith("/")).toBe(false);
    expect(DEFAULT_SITE_URL).toMatch(/^https:\/\//);
  });

  it("strips trailing slashes and whitespace", () => {
    expect(normalizeOrigin("  https://frelux.com/  ")).toBe("https://frelux.com");
    expect(normalizeOrigin("https://frelux.com///")).toBe("https://frelux.com");
  });

  it("exposes the bare host for IndexNow and mailto fields", () => {
    expect(SITE_HOST).toBe(SITE_URL.replace(/^https?:\/\//, ""));
    expect(SITE_HOST).not.toContain("/");
  });

  it("builds absolute URLs without double slashes", () => {
    expect(siteUrl()).toBe(SITE_URL);
    expect(siteUrl("/")).toBe(SITE_URL);
    expect(siteUrl("/pricing")).toBe(`${SITE_URL}/pricing`);
    expect(siteUrl("pricing")).toBe(`${SITE_URL}/pricing`);
    expect(siteUrl("/learn/article-slug")).toBe(`${SITE_URL}/learn/article-slug`);
  });
});

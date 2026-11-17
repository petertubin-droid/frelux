import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { isAdExemptPath, shouldShowLayoutAd } from "@/lib/ad-placement-policy";

describe("ad placement policy", () => {
  it("places a content ad on public content pages", () => {
    expect(shouldShowLayoutAd("/")).toBe(true);
    expect(shouldShowLayoutAd("/about")).toBe(true);
    expect(shouldShowLayoutAd("/glossary")).toBe(true);
    expect(shouldShowLayoutAd("/case-studies/school-in-lekki")).toBe(true);
    expect(shouldShowLayoutAd("/marketplace")).toBe(true);
  });

  it("keeps tool pages on their own placements", () => {
    expect(shouldShowLayoutAd("/flooring")).toBe(false);
    expect(shouldShowLayoutAd("/flooring/")).toBe(false);
  });

  it("never places an ad inside a console or a person's own documents", () => {
    for (const path of [
      "/admin/finance",
      "/admin/business-ledger",
      "/studio/overview",
      "/dashboard",
      "/projects/123",
      "/quote/abc",
      "/client/estimate/abc",
      "/share/project/abc",
      "/settings",
      "/profile",
    ]) {
      expect(isAdExemptPath(path)).toBe(true);
      expect(shouldShowLayoutAd(path)).toBe(false);
    }
  });

  it("does not exempt a path that merely starts with the same letters", () => {
    expect(isAdExemptPath("/administrator-guide")).toBe(false); // a different page, not inside /admin
    expect(isAdExemptPath("/accounting-exports")).toBe(false);
    expect(isAdExemptPath("/settings-guide")).toBe(false);
    expect(isAdExemptPath("/projector-cost")).toBe(false);
  });

  it("is wired into the public layout, which renders the content placement", () => {
    const layout = readFileSync("src/components/layout/Layout.tsx", "utf8");
    expect(layout).toContain('from "@/lib/ad-placement-policy"');
    expect(layout).toContain("shouldShowLayoutAd(location.pathname)");
    expect(layout).toContain('slotKey="content_native"');
  });
});

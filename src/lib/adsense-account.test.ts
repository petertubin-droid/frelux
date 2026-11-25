/**
 * AdSense review invariants.
 *
 * Each of these encodes a documented rejection cause, so a future edit that
 * reintroduces one fails here instead of in Google's queue:
 *  - two publisher tags on one page ("unexpected behaviour", tag evaluation)
 *  - a permanent pauseAdRequests before consent (crawler cannot verify)
 *  - two google.com seller records in ads.txt (duplicate-account signal)
 *  - a third-party network serving while the account is under review
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { siteConfig } from "@/config/site";

const html = readFileSync(join(process.cwd(), "index.html"), "utf8");
const adsTxt = readFileSync(join(process.cwd(), "public/ads.txt"), "utf8");

describe("AdSense account hygiene", () => {
  it("serves exactly one publisher loader", () => {
    const loaders = html.match(/adsbygoogle\.js\?client=ca-pub-\d+/g) ?? [];
    expect(loaders).toHaveLength(1);
    expect(loaders[0]).toContain(siteConfig.adsense.publisherId);
  });

  it("authorises exactly one publisher in ads.txt", () => {
    const records = adsTxt
      .split("\n")
      .filter((line) => line.trim().startsWith("google.com,"));
    expect(records).toHaveLength(1);
    expect(records[0]).toContain("pub-4906239537212380");
    expect(adsTxt).not.toContain("pub-3404100134534192");
  });

  it("declares no additional publisher accounts", () => {
    expect(siteConfig.adsense.additionalPublisherIds).toEqual([]);
    for (const extra of siteConfig.adsense.additionalPublisherIds) {
      expect(html).not.toContain(extra);
    }
  });

  it("names the verified account in the site-ownership meta tag", () => {
    expect(html).toContain(
      `<meta name="google-adsense-account" content="${siteConfig.adsense.publisherId}" />`,
    );
  });

  it("does not pause ad requests before a visitor has decided", () => {
    // The pause may only appear inside the branch that reads a stored refusal.
    const boot = html.slice(
      html.indexOf("window.adsbygoogle = window.adsbygoogle || []"),
      html.indexOf("</script>", html.indexOf("window.adsbygoogle = window.adsbygoogle")),
    );
    const pauseAt = boot.indexOf("pauseAdRequests = 1");
    const refusalAt = boot.indexOf("stored.categories.advertising === true");
    expect(pauseAt).toBeGreaterThan(-1);
    expect(refusalAt).toBeGreaterThan(-1);
    // A pause that appears before the consent branch would hit the crawler too.
    expect(pauseAt).toBeGreaterThan(refusalAt);
  });

  it("defaults to non-personalised ads, which need no consent", () => {
    expect(html).toContain("window.adsbygoogle.requestNonPersonalizedAds = 1");
  });

  it("keeps third-party networks off while the account is under review", () => {
    expect(siteConfig.ads.thirdPartyNetworksEnabled).toBe(false);
  });
});

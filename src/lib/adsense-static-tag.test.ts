import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { siteConfig } from "@/config/site";
import { adsTxtRecords } from "./ad-sellers";

/**
 * AdSense can only verify the site and attach auto ads when the loader is in
 * the served source, so it lives in index.html rather than being injected by
 * the app. These assertions protect the two things that matter: the exact
 * publisher, and that requests start paused so an unanswered visit never
 * receives an ad.
 */
const html = readFileSync(join(process.cwd(), "index.html"), "utf8");

describe("AdSense tag in the served HTML", () => {
  it("names the primary account in the meta tag the crawler reads", () => {
    // Site ownership is verified from this tag, so it has to name the account
    // being reviewed. Pointing it at a different account than the loader is how
    // "we added the code but AdSense still says it cannot find it" happens.
    const primary = siteConfig.adsense.publisherId;
    expect(html).toContain(
      `<meta name="google-adsense-account" content="${primary}" />`,
    );
    expect(html).toContain(`adsbygoogle.js?client=${primary}`);
  });

  it("keeps every authorised account loadable, including the original", () => {
    for (const id of [
      siteConfig.adsense.publisherId,
      ...siteConfig.adsense.additionalPublisherIds,
    ]) {
      expect(html).toContain(`adsbygoogle.js?client=${id}`);
    }
  });

  it("lists both accounts as sellers so either can be verified", () => {
    const records = adsTxtRecords(
      siteConfig.adsense.publisherId,
      siteConfig.adsense.additionalPublisherIds,
    );
    const adsTxt = readFileSync(join(process.cwd(), "public/ads.txt"), "utf8");
    for (const record of records) expect(adsTxt).toContain(record);
  });

  it("loads the auto ads library once, for the account under review", () => {
    const loaders = html.match(/adsbygoogle\.js\?client=ca-pub-\d+/g) ?? [];
    expect(loaders).toHaveLength(1);
    expect(html).toContain(
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4906239537212380",
    );
    expect(html).toContain('crossorigin="anonymous"');
  });

  it("requests nothing personal before a choice, without blocking verification", () => {
    // A permanent pauseAdRequests blocks the AdSense crawler, which cannot
    // answer the cookie banner. Non-personalised ads are the consent-free
    // default; a pause is only applied to a stored refusal.
    expect(html).toContain("window.adsbygoogle.requestNonPersonalizedAds = 1");
    const boot = html.indexOf("window.adsbygoogle = window.adsbygoogle");
    const pauseAt = html.indexOf("pauseAdRequests = 1");
    const refusalAt = html.indexOf("stored.categories.advertising === true");
    expect(refusalAt).toBeGreaterThan(boot);
    expect(pauseAt).toBeGreaterThan(refusalAt);
  });

  it("reads the stored choice from the same key the banner writes", () => {
    expect(html).toContain('localStorage.getItem("frelux_cookie_consent")');
    expect(html).toContain("stored.categories.advertising");
  });

  it("keeps the tag inside the head, before the app mounts", () => {
    expect(html.indexOf("adsbygoogle.js?client=")).toBeLessThan(
      html.indexOf('id="root"'),
    );
  });
});

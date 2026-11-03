import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * AdSense can only verify the site and attach auto ads when the loader is in
 * the served source, so it lives in index.html rather than being injected by
 * the app. These assertions protect the two things that matter: the exact
 * publisher, and that requests start paused so an unanswered visit never
 * receives an ad.
 */
const html = readFileSync(join(process.cwd(), "index.html"), "utf8");

describe("AdSense tag in the served HTML", () => {
  it("loads the auto ads library for the FRELUX publisher", () => {
    expect(html).toContain(
      "https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3404100134534192",
    );
    expect(html).toContain('crossorigin="anonymous"');
  });

  it("boots paused so nothing is requested before a consent choice", () => {
    const pauseIndex = html.indexOf("pauseAdRequests = 1");
    const tagIndex = html.indexOf("adsbygoogle.js?client=");
    expect(pauseIndex).toBeGreaterThan(-1);
    expect(tagIndex).toBeGreaterThan(-1);
    expect(pauseIndex).toBeLessThan(tagIndex);
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

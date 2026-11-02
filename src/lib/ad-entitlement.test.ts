import { describe, it, expect, afterEach } from "vitest";
import {
  adsAllowedForViewer,
  hideAdContainers,
  purgeInjectedAdTags,
} from "./ad-entitlement";

describe("adsAllowedForViewer", () => {
  it("refuses every ad for a paid subscriber", () => {
    expect(adsAllowedForViewer({ isPaid: true, loading: false })).toBe(false);
  });

  it("refuses ads while the entitlement is still unknown", () => {
    // The gap between first paint and the paid status landing is exactly
    // when a Monetag popunder used to slip through.
    expect(adsAllowedForViewer({ isPaid: false, loading: true })).toBe(false);
    expect(adsAllowedForViewer({ isPaid: true, loading: true })).toBe(false);
  });

  it("allows ads only once a free viewer is resolved", () => {
    expect(adsAllowedForViewer({ isPaid: false, loading: false })).toBe(true);
  });
});

describe("purgeInjectedAdTags", () => {
  afterEach(() => {
    document.head.innerHTML = "";
    document.body.innerHTML = "";
  });

  it("removes every provider tag the app injects", () => {
    const markers: Array<[string, string]> = [
      ["data-adsense-page-level", "true"],
      ["data-adsterra-format", "interstitial"],
      ["data-adsterra-native", "true"],
      ["data-monetag-auto", "vignette"],
      ["data-monetag-sdk", "true"],
      ["data-frelux-monetag-push", "9876543"],
    ];
    for (const [attr, value] of markers) {
      const s = document.createElement("script");
      s.setAttribute(attr, value);
      document.head.appendChild(s);
    }
    expect(document.head.querySelectorAll("script")).toHaveLength(
      markers.length,
    );

    expect(purgeInjectedAdTags()).toBe(markers.length);
    expect(document.head.querySelectorAll("script")).toHaveLength(0);
  });

  it("leaves non-ad scripts untouched", () => {
    const app = document.createElement("script");
    app.src = "/src/main.tsx";
    document.head.appendChild(app);
    const ad = document.createElement("script");
    ad.setAttribute("data-monetag-sdk", "true");
    document.head.appendChild(ad);

    expect(purgeInjectedAdTags()).toBe(1);
    expect(document.head.querySelectorAll("script")).toHaveLength(1);
    expect(document.head.querySelector("script")?.src).toContain("main.tsx");
  });
});

describe("hideAdContainers", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("hides leftover ad containers instead of leaving empty boxes", () => {
    const div = document.createElement("div");
    div.setAttribute("data-ad-container", "native");
    document.body.appendChild(div);
    hideAdContainers();
    expect(div.style.display).toBe("none");
  });
});

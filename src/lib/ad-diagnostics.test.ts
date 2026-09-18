// =========================================================
// AD DIAGNOSTICS TESTS
//
// The dev-only ad integration trail. Vitest runs with
// import.meta.env.DEV = true, so here the full behavior is
// pinned:
//   * events are recorded with provider/event/detail
//   * the trail is exposed on window.__freluxAds.events
//   * the trail is capped at MAX_EVENTS (200) — the oldest
//     events drop first
//   * instrumentScript wires load/error listeners
// =========================================================
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  adDebug,
  instrumentScript,
  type AdDiagnosticEvent,
} from "./ad-diagnostics";

type AdsWithTrail = { __freluxAds?: { events: AdDiagnosticEvent[] } };

function trail(): AdDiagnosticEvent[] {
  return (window as unknown as AdsWithTrail).__freluxAds?.events ?? [];
}

beforeEach(() => {
  vi.spyOn(console, "debug").mockImplementation(() => {});
  vi.spyOn(console, "log").mockImplementation(() => {});
  delete (window as unknown as AdsWithTrail).__freluxAds;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("adDebug (dev mode)", () => {
  it("records provider/event/detail with a timestamp", () => {
    const before = Date.now();
    adDebug("adsterra", "script:injected", { src: "https://x/y.js" });
    const [e] = trail();
    expect(e.provider).toBe("adsterra");
    expect(e.event).toBe("script:injected");
    expect(e.detail).toEqual({ src: "https://x/y.js" });
    expect(e.t).toBeGreaterThanOrEqual(before);
  });

  it("detail is optional and omitted when absent", () => {
    const before = trail().length;
    adDebug("monetag", "slot:resolved");
    const e = trail()[trail().length - 1];
    expect(e.provider).toBe("monetag");
    expect("detail" in e).toBe(false);
  });

  it("exposes the trail on window.__freluxAds.events", () => {
    adDebug("a", "one");
    adDebug("b", "two");
    const t = trail();
    expect(t.slice(-2).map((e) => e.event)).toEqual(["one", "two"]);
  });

  it("caps the trail at 200 events, dropping the oldest", () => {
    for (let i = 0; i < 205; i++) adDebug("p", `e${i}`);
    const t = trail();
    expect(t).toHaveLength(200);
    expect(t[0].event).toBe("e5"); // oldest dropped
    expect(t[t.length - 1].event).toBe("e204");
  });
});

describe("instrumentScript (dev mode)", () => {
  it("wires load and error diagnostics to a script element", () => {
    const s = document.createElement("script");
    s.src = "https://ads.example/lib.js";
    instrumentScript("adsterra", s, "banner");
    s.dispatchEvent(new Event("load"));
    const events = trail().map((e) => e.event);
    expect(events).toContain("banner:loaded");
    s.dispatchEvent(new Event("error"));
    expect(trail().map((e) => e.event)).toContain("banner:error");
    const err = trail().find((e) => e.event === "banner:error");
    expect(err?.detail).toEqual({ src: "https://ads.example/lib.js" });
  });
});

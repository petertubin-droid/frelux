import { describe, it, expect } from "vitest";
import { keptWorkerPaths, shouldUnregisterWorker } from "@/lib/sw-cleanup";

const ORIGIN = "https://freluxtools.com";

describe("service worker cleanup", () => {
  it("keeps our own precache worker", () => {
    expect(shouldUnregisterWorker(`${ORIGIN}/sw.js`, ORIGIN)).toBe(false);
  });

  it("keeps the ad network push worker the site hosts", () => {
    // Entitlement decides whether it survives; the load sweep never removes it,
    // because doing so would also drop it for the free visitors entitled to it.
    expect(shouldUnregisterWorker(`${ORIGIN}/sw4.js`, ORIGIN)).toBe(false);
  });

  it("keeps our own notification worker", () => {
    expect(shouldUnregisterWorker(`${ORIGIN}/sw-push.js`, ORIGIN)).toBe(false);
  });

  it("reaps a superseded ad network worker", () => {
    // The previous Monetag worker. Devices that still run it must drop it,
    // otherwise the old zone keeps serving after the file is replaced.
    expect(shouldUnregisterWorker(`${ORIGIN}/sw1.js`, ORIGIN)).toBe(true);
  });

  it("reaps workers from another origin", () => {
    expect(
      shouldUnregisterWorker(
        "https://5gvci.com/act/files/service-worker.min.js",
        ORIGIN,
      ),
    ).toBe(true);
  });

  it("reaps an unparseable script URL rather than keeping it", () => {
    expect(shouldUnregisterWorker("", ORIGIN)).toBe(true);
  });

  it("lists every kept path", () => {
    expect(keptWorkerPaths()).toEqual(["/sw.js", "/sw-push.js", "/sw4.js"]);
  });
});

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  AD_PUSH_WORKER_PATH,
  STALE_AD_WORKER_PATHS,
  syncAdPushWorker,
} from "@/lib/ad-worker";

const ORIGIN = "https://freluxtools.com";

interface FakeRegistration {
  path: string;
  unregister: ReturnType<typeof vi.fn>;
}

function installWorkers(paths: string[]): FakeRegistration[] {
  const regs: FakeRegistration[] = paths.map((path) => ({
    path,
    unregister: vi.fn(async () => true),
  }));
  Object.defineProperty(navigator, "serviceWorker", {
    configurable: true,
    value: {
      getRegistrations: async () =>
        regs.map((reg) => ({
          active: { scriptURL: `${ORIGIN}${reg.path}` },
          unregister: reg.unregister,
        })),
    },
  });
  return regs;
}

describe("ad push worker gate", () => {
  beforeEach(() => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });
  });

  afterEach(() => {
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: undefined,
    });
  });

  it("unregisters the worker for a paid subscriber", async () => {
    const regs = installWorkers([AD_PUSH_WORKER_PATH, "/sw.js"]);
    const removed = await syncAdPushWorker({ adsAllowed: false });

    expect(regs[0].unregister).toHaveBeenCalledTimes(1);
    // Our own precache worker is never touched.
    expect(regs[1].unregister).not.toHaveBeenCalled();
    expect(removed).toBe(1);
  });

  it("leaves the worker alone for a consented free visitor", async () => {
    const regs = installWorkers([AD_PUSH_WORKER_PATH]);
    const removed = await syncAdPushWorker({ adsAllowed: true });

    expect(regs[0].unregister).not.toHaveBeenCalled();
    expect(removed).toBe(0);
  });

  it("clears a superseded worker even when ads are allowed", async () => {
    const regs = installWorkers([
      STALE_AD_WORKER_PATHS[0],
      AD_PUSH_WORKER_PATH,
    ]);
    await syncAdPushWorker({ adsAllowed: true });

    expect(regs[0].unregister).toHaveBeenCalledTimes(1);
    expect(regs[1].unregister).not.toHaveBeenCalled();
  });

  it("does nothing in a browser without service workers", async () => {
    await expect(syncAdPushWorker({ adsAllowed: false })).resolves.toBe(0);
  });

  it("survives a registration that refuses to unregister", async () => {
    const regs = installWorkers([AD_PUSH_WORKER_PATH]);
    regs[0].unregister.mockRejectedValueOnce(new Error("detached"));

    await expect(syncAdPushWorker({ adsAllowed: false })).resolves.toBe(0);
  });
});

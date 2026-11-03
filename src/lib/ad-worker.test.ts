import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RETIRED_AD_WORKER_PATHS, syncAdPushWorker } from "@/lib/ad-worker";

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

describe("retired ad push workers", () => {
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

  it("removes a worker issued for the previous site address", async () => {
    const regs = installWorkers(["/sw4.js", "/sw.js", "/sw-push.js"]);
    const removed = await syncAdPushWorker();

    expect(regs[0].unregister).toHaveBeenCalledTimes(1);
    // Our own two workers are never touched.
    expect(regs[1].unregister).not.toHaveBeenCalled();
    expect(regs[2].unregister).not.toHaveBeenCalled();
    expect(removed).toBe(1);
  });

  it("clears every path the network has issued over time", async () => {
    const regs = installWorkers([...RETIRED_AD_WORKER_PATHS]);
    const removed = await syncAdPushWorker();

    expect(removed).toBe(RETIRED_AD_WORKER_PATHS.length);
    for (const reg of regs) expect(reg.unregister).toHaveBeenCalledTimes(1);
  });

  it("leaves a browser with no retired workers alone", async () => {
    const regs = installWorkers(["/sw.js", "/sw-push.js"]);
    await expect(syncAdPushWorker()).resolves.toBe(0);
    for (const reg of regs) expect(reg.unregister).not.toHaveBeenCalled();
  });

  it("does nothing in a browser without service workers", async () => {
    await expect(syncAdPushWorker()).resolves.toBe(0);
  });

  it("survives a registration that refuses to unregister", async () => {
    installWorkers(["/sw4.js"]);
    const regs = await navigator.serviceWorker.getRegistrations();
    void regs;
    const fake = navigator.serviceWorker as unknown as {
      getRegistrations: () => Promise<
        { active: { scriptURL: string }; unregister: () => Promise<boolean> }[]
      >;
    };
    fake.getRegistrations = async () => [
      {
        active: { scriptURL: `${ORIGIN}/sw4.js` },
        unregister: async () => {
          throw new Error("detached");
        },
      },
    ];
    await expect(syncAdPushWorker()).resolves.toBe(0);
  });
});

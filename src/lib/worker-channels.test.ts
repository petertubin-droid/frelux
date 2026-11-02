import { describe, it, expect, vi } from "vitest";

function createChainable() {
  const chain: Record<string, unknown> = {
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((resolve: (v: unknown) => void) =>
      Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
    ),
  };
  const proxy = new Proxy(chain, {
    get(target: Record<string, unknown>, prop: string) {
      if (prop in target) return target[prop];
      if (prop === "then") return target.then;
      target[prop] = vi.fn().mockReturnValue(proxy);
      return target[prop];
    },
  });
  return proxy;
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn().mockReturnValue(createChainable()),
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
    auth: {
      getSession: vi
        .fn()
        .mockResolvedValue({ data: { session: null }, error: null }),
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "test-user" } },
        error: null,
      }),
    },
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    channel: vi.fn().mockReturnValue({
      on: vi.fn().mockReturnThis(),
      subscribe: vi.fn().mockReturnValue({ unsubscribe: vi.fn() }),
    }),
  },
  isSupabaseConfigured: false,
}));

const mod = await import("./worker-channels");

describe("worker-channels (supabase not configured)", () => {
  it("fetchChannelCategories does not throw", async () => {
    await expect(mod.fetchChannelCategories()).resolves.not.toThrow();
  });

  it("fetchChannels does not throw", async () => {
    await expect(mod.fetchChannels()).resolves.not.toThrow();
  });

  it("fetchChannelBySlug does not throw", async () => {
    await expect(mod.fetchChannelBySlug("test-slug")).resolves.not.toThrow();
  });

  it("joinChannel does not throw", async () => {
    await expect(mod.joinChannel("ch1", "user1")).resolves.not.toThrow();
  });

  it("leaveChannel does not throw", async () => {
    await expect(mod.leaveChannel("ch1", "user1")).resolves.not.toThrow();
  });

  it("isMember does not throw", async () => {
    await expect(mod.isMember("ch1", "user1")).resolves.not.toThrow();
  });

  it("sendMessage does not throw", async () => {
    await expect(
      mod.sendMessage({} as unknown as never),
    ).resolves.not.toThrow();
  });

  it("subscribeToChannelMessages returns subscription", () => {
    const unsub = mod.subscribeToChannelMessages("ch1", () => {});
    expect(unsub).toBeTruthy();
    expect(typeof unsub.unsubscribe).toBe("function");
  });

  it("fetchModerationConfig does not throw", async () => {
    await expect(mod.fetchModerationConfig()).resolves.not.toThrow();
  });

  it("isWorkerAccount does not throw", async () => {
    await expect(mod.isWorkerAccount("user1")).resolves.toBe(false);
  });

  it("getUserVerificationTier does not throw", async () => {
    await expect(mod.getUserVerificationTier("user1")).resolves.toBe(0);
  });

  it("canAccessChannels returns boolean for tier", () => {
    expect(mod.canAccessChannels(1)).toBe(false);
    expect(mod.canAccessChannels(2)).toBe(true);
    expect(mod.canAccessChannels(3)).toBe(true);
  });

  it("fetchChatUserProfile does not throw", async () => {
    await expect(mod.fetchChatUserProfile("user1")).resolves.not.toThrow();
  });

  it("adminApproveNin does not throw", async () => {
    await expect(mod.adminApproveNin("profile1")).resolves.not.toThrow();
  });

  it("adminRejectNin does not throw", async () => {
    await expect(
      mod.adminRejectNin("profile1", "reason"),
    ).resolves.not.toThrow();
  });
});

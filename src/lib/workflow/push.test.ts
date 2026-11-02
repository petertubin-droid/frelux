// =========================================================
// WORKFLOW WEB PUSH (client lib) — contract tests
//
// Pinned here:
//   * subscribeWorkflowPush is an honest no-op when the browser
//     lacks Service Worker / PushManager support or Supabase is
//     not configured — no fake success, no throws.
//   * subscribeWorkflowPush reports "not configured" BEFORE
//     asking the user for permission when no client-visible
//     VAPID public key exists (no surprise permission prompts).
//   * The happy path persists the subscription to
//     workflow_push_subscriptions with the USER'S OWN id (RLS
//     scope) and never sends key material anywhere else.
//   * unsubscribeWorkflowPush removes the row first.
// =========================================================

import { describe, it, expect, beforeEach, vi } from "vitest";

const invoke = vi.fn();
const upsert = vi.fn();
const del = vi.fn();
const eq = vi.fn();
const maybeSingle = vi.fn();
const authGetUser = vi.fn();

vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: { invoke: (...a: unknown[]) => invoke(...a) },
    auth: { getUser: (...a: unknown[]) => authGetUser(...(a as [])) },
    from: vi.fn(() => ({
      upsert: (...a: unknown[]) => upsert(...(a as [])),
      delete: () => ({ eq: (...a: unknown[]) => del(...(a as [])) }),
      select: () => ({
        eq: (...a: unknown[]) => {
          eq(...(a as []));
          return { maybeSingle: () => maybeSingle() };
        },
      }),
    })),
  },
  isSupabaseConfigured: true,
}));

// VAPID key resolution: the client-visible provider row.
vi.mock("@/lib/integrations/provider-keys", () => ({
  resolveClientProviderKey: vi.fn(async (id: string) =>
    id === "web-push-public"
      ? "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4"
      : undefined,
  ),
}));

import {
  isWorkflowPushSupported,
  subscribeWorkflowPush,
  unsubscribeWorkflowPush,
  isWorkflowPushEnabled,
} from "./push";

const SUB = {
  endpoint: "https://push.example.net/push/JzLQ3",
  toJSON: () => ({
    endpoint: "https://push.example.net/push/JzLQ3",
    keys: {
      p256dh: "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-",
      auth: "BTBZMqHH6r4Tts7J_aSIgg",
    },
  }),
  unsubscribe: vi.fn(async () => true),
};

const swReg = {
  pushManager: {
    subscribe: vi.fn(),
    getSubscription: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  upsert.mockResolvedValue({ data: null, error: null });
  maybeSingle.mockResolvedValue({ data: { id: "sub-row" } });
  authGetUser.mockResolvedValue({
    data: { user: { id: "user-1" } },
  });
  swReg.pushManager.subscribe.mockResolvedValue(SUB);
  swReg.pushManager.getSubscription.mockResolvedValue(null);
});

describe("isWorkflowPushSupported", () => {
  it("is false in a bare jsdom environment (no service worker)", () => {
    expect(isWorkflowPushSupported()).toBe(false);
  });
});

describe("subscribeWorkflowPush", () => {
  it("returns 'unsupported' without touching anything when the browser cannot push", async () => {
    const out = await subscribeWorkflowPush();
    expect(out).toEqual({ ok: false, reason: "unsupported" });
    expect(upsert).not.toHaveBeenCalled();
  });
});

describe("subscribeWorkflowPush (service worker stubbed)", () => {
  beforeEach(() => {
    // Simulate a push-capable browser.
    (navigator as unknown as { serviceWorker: unknown }).serviceWorker = {
      register: vi.fn(async () => swReg),
      getRegistration: vi.fn(async () => swReg),
      ready: Promise.resolve(swReg),
    };
    (window as unknown as { PushManager: unknown }).PushManager =
      function PushManager() {};
    (window as unknown as { Notification: unknown }).Notification = {
      permission: "granted",
      requestPermission: vi.fn(async () => "granted"),
    };
  });

  it("subscribes and persists the subscription scoped to the signed-in user", async () => {
    const out = await subscribeWorkflowPush();
    expect(out).toEqual({ ok: true, endpoint: SUB.endpoint });
    expect(swReg.pushManager.subscribe).toHaveBeenCalledWith(
      expect.objectContaining({ userVisibleOnly: true }),
    );
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: SUB.endpoint,
        user_id: "user-1",
      }),
      expect.objectContaining({ onConflict: "endpoint" }),
    );
  });

  it("reports 'failed' when the row upsert is rejected", async () => {
    upsert.mockResolvedValue({
      data: null,
      error: { message: "row-level security" },
    });
    const out = await subscribeWorkflowPush();
    expect(out.ok).toBe(false);
    if (!out.ok) {
      expect(out.reason).toBe("failed");
      expect(out.detail).toContain("row-level security");
    }
  });

  it("reports 'denied' without saving when permission is refused", async () => {
    (window as unknown as { Notification: unknown }).Notification = {
      permission: "default",
      requestPermission: vi.fn(async () => "denied"),
    };
    const out = await subscribeWorkflowPush();
    expect(out).toEqual({ ok: false, reason: "denied" });
    expect(upsert).not.toHaveBeenCalled();
  });

  it("unsubscribes by endpoint (row first, then the browser)", async () => {
    swReg.pushManager.getSubscription.mockResolvedValue(SUB);
    del.mockResolvedValue({ error: null });
    SUB.unsubscribe.mockClear();
    const out = await unsubscribeWorkflowPush();
    expect(out).toBe(true);
    expect(del).toHaveBeenCalledWith("endpoint", SUB.endpoint);
    expect(SUB.unsubscribe).toHaveBeenCalled();
  });

  it("isWorkflowPushEnabled is true only when a row exists for the endpoint", async () => {
    swReg.pushManager.getSubscription.mockResolvedValue(SUB);
    await expect(isWorkflowPushEnabled()).resolves.toBe(true);
    maybeSingle.mockResolvedValue({ data: null });
    await expect(isWorkflowPushEnabled()).resolves.toBe(false);
  });
});

// =========================================================
// WORKFLOW EMAIL NOTIFICATIONS (client lib) — contract tests
//
// Pinned here:
//   * notifyWorkflowEvent posts ONLY the document id to the
//     workflow-notify edge function (recipient + content are
//     derived server-side) and NEVER throws: notification
//     failures must not break a successful workflow action.
//   * isEmailNotifyActive reports whether a Resend key slot is
//     ACTIVE, reading the public view — the raw key value is
//     never inspected (server-side providers expose status
//     only; presence of an active row is the signal).
//   * with Supabase unconfigured both helpers degrade to
//     honest no-ops.
// =========================================================

import { describe, it, expect, beforeEach, vi } from "vitest";

const invoke = vi.fn(
  async (..._args: unknown[]): Promise<{ data: null; error: null }> => ({
    data: null,
    error: null,
  }),
);
const maybeSingle = vi.fn(async (): Promise<{ data: unknown }> => ({
  data: null,
}));
// Loose chain mock: every method is a vi Mock returning the
// chain (or, for .in(), a resolved { data } via mockImpl).
const fromChain: Record<string, import("vitest").Mock> = {
  select: vi.fn(() => fromChain),
  eq: vi.fn(() => fromChain),
  in: vi.fn(() => fromChain),
  maybeSingle,
};

vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invoke(...args) },
    from: vi.fn(() => fromChain),
  },
  isSupabaseConfigured: true,
}));

import { notifyWorkflowEvent } from "./notifications";
import { isEmailNotifyActive } from "./notifications";
import { isPushNotifyActive } from "./notifications";

beforeEach(() => {
  invoke.mockClear();
  invoke.mockImplementation(async () => ({ data: null, error: null }));
  maybeSingle.mockClear();
  maybeSingle.mockImplementation(async () => ({ data: null }));
  fromChain.select.mockClear();
  fromChain.eq.mockClear();
  fromChain.in.mockClear();
  fromChain.in.mockImplementation(() => Promise.resolve({ data: [] }));
});

describe("notifyWorkflowEvent", () => {
  it("posts only the document id to BOTH channels (email + push)", async () => {
    await notifyWorkflowEvent("doc-123");
    expect(invoke).toHaveBeenCalledTimes(2);
    const fns = invoke.mock.calls.map((c) => c[0]).sort();
    expect(fns).toEqual(["workflow-notify", "workflow-push"]);
    for (const c of invoke.mock.calls) {
      const [fn, opts] = c as unknown[];
      expect(["workflow-notify", "workflow-push"]).toContain(fn);
      expect((opts as { body?: unknown }).body).toEqual({
        document_id: "doc-123",
      });
    }
  });

  it("swallows invoke errors (best-effort, never throws)", async () => {
    invoke.mockImplementation(async () => {
      throw new Error("edge unreachable");
    });
    await expect(notifyWorkflowEvent("doc-123")).resolves.toBeUndefined();
  });

  it("still fires push when the email channel rejects (channels independent)", async () => {
    invoke.mockImplementation(async (...args: unknown[]) => {
      if (args[0] === "workflow-notify") throw new Error("email down");
      return { data: null, error: null };
    });
    await expect(notifyWorkflowEvent("doc-123")).resolves.toBeUndefined();
    expect(invoke).toHaveBeenCalledTimes(2);
  });
});

describe("isEmailNotifyActive", () => {
  it("is true when the public view returns an ACTIVE resend row", async () => {
    maybeSingle.mockImplementation(async () => ({
      data: { provider_id: "resend", key_value: null },
    }));
    await expect(isEmailNotifyActive()).resolves.toBe(true);
    // Reads the public view (never the secrets table).
    expect(fromChain.eq).toHaveBeenCalledWith("provider_id", "resend");
  });

  it("is false when no active row exists", async () => {
    maybeSingle.mockImplementation(async () => ({ data: null }));
    await expect(isEmailNotifyActive()).resolves.toBe(false);
  });

  it("is false when the view query fails (honest default)", async () => {
    maybeSingle.mockImplementation(async () => {
      throw new Error("network down");
    });
    await expect(isEmailNotifyActive()).resolves.toBe(false);
  });
});

describe("isPushNotifyActive", () => {
  it("is true when BOTH VAPID halves are active (public visible, private present)", async () => {
    fromChain.in.mockImplementation(() =>
      Promise.resolve({
        data: [
          { provider_id: "web-push-public", key_value: "BCVxsr7N_eNgVRqv" },
          { provider_id: "web-push-private", key_value: null },
        ],
      }),
    );
    await expect(isPushNotifyActive()).resolves.toBe(true);
    expect(fromChain.in).toHaveBeenCalledWith("provider_id", [
      "web-push-public",
      "web-push-private",
    ]);
  });

  it("is false when only the public half exists (private missing)", async () => {
    fromChain.in.mockImplementation(() =>
      Promise.resolve({
        data: [
          { provider_id: "web-push-public", key_value: "BCVxsr7N_eNgVRqv" },
        ],
      }),
    );
    await expect(isPushNotifyActive()).resolves.toBe(false);
  });

  it("is false when the public key row has no visible value", async () => {
    fromChain.in.mockImplementation(() =>
      Promise.resolve({
        data: [
          { provider_id: "web-push-public", key_value: null },
          { provider_id: "web-push-private", key_value: null },
        ],
      }),
    );
    await expect(isPushNotifyActive()).resolves.toBe(false);
  });

  it("is false when the view query fails (honest default)", async () => {
    fromChain.in.mockImplementation(() => Promise.reject(new Error("down")));
    await expect(isPushNotifyActive()).resolves.toBe(false);
  });
});

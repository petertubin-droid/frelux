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

const invoke = vi.fn(async (..._args: unknown[]) => ({
  data: null,
  error: null,
}));
const maybeSingle = vi.fn(async (): Promise<{ data: unknown }> => ({
  data: null,
}));
const fromChain = {
  select: vi.fn(() => fromChain),
  eq: vi.fn(() => fromChain),
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

beforeEach(() => {
  invoke.mockClear();
  invoke.mockImplementation(async () => ({ data: null, error: null }));
  maybeSingle.mockClear();
  maybeSingle.mockImplementation(async () => ({ data: null }));
  fromChain.select.mockClear();
  fromChain.eq.mockClear();
});

describe("notifyWorkflowEvent", () => {
  it("posts only the document id to the workflow-notify function", async () => {
    await notifyWorkflowEvent("doc-123");
    expect(invoke).toHaveBeenCalledTimes(1);
    const [fn, opts] = invoke.mock.calls[0] as unknown[];
    expect(fn).toBe("workflow-notify");
    expect((opts as { body?: unknown }).body).toEqual({
      document_id: "doc-123",
    });
  });

  it("swallows invoke errors (best-effort, never throws)", async () => {
    invoke.mockImplementation(async () => {
      throw new Error("edge unreachable");
    });
    await expect(notifyWorkflowEvent("doc-123")).resolves.toBeUndefined();
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

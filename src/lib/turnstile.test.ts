import { beforeEach, describe, expect, it, vi } from "vitest";

const invoke = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { functions: { invoke: (...args: unknown[]) => invoke(...args) } },
}));

async function loadModule() {
  vi.resetModules();
  return import("./turnstile");
}

describe("verifyTurnstileToken", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  it("passes when the backend vouches for the token", async () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    const { verifyTurnstileToken } = await loadModule();
    await expect(verifyTurnstileToken("token", "contact")).resolves.toEqual({
      ok: true,
    });
    expect(invoke).toHaveBeenCalledWith("turnstile-verify", {
      body: { token: "token", action: "contact" },
    });
  });

  it("carries the backend reason when it refuses", async () => {
    invoke.mockResolvedValue({
      data: { ok: false, error: "action-mismatch" },
      error: null,
    });
    const { verifyTurnstileToken } = await loadModule();
    await expect(verifyTurnstileToken("token", "signup")).resolves.toEqual({
      ok: false,
      reason: "action-mismatch",
    });
  });

  it("fails closed when the call itself fails", async () => {
    invoke.mockRejectedValue(new Error("offline"));
    const { verifyTurnstileToken } = await loadModule();
    await expect(verifyTurnstileToken("token", "contact")).resolves.toEqual({
      ok: false,
      reason: "network",
    });
  });

  it("rejects an empty token without calling the backend", async () => {
    const { verifyTurnstileToken } = await loadModule();
    await expect(verifyTurnstileToken(null, "contact")).resolves.toEqual({
      ok: false,
      reason: "missing-token",
    });
    expect(invoke).not.toHaveBeenCalled();
  });
});

describe("turnstileErrorMessage", () => {
  it("names the connection for a network failure and asks for a retry otherwise", async () => {
    const { turnstileErrorMessage } = await loadModule();
    expect(turnstileErrorMessage({ ok: false, reason: "network" })).toMatch(
      /connection/i,
    );
    expect(turnstileErrorMessage({ ok: false, reason: "rejected" })).toMatch(
      /complete the check again/i,
    );
  });
});

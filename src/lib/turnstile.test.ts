import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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
    // Keep these cases on the Supabase path; the edge ones set their own origin.
    vi.stubEnv("VITE_R2_WORKER_URL", "");
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

const EDGE = "https://files.example";
const jsonRes = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

async function loadWithEdge() {
  vi.stubEnv("VITE_R2_WORKER_URL", `${EDGE}/`);
  return loadModule();
}

describe("verifyTurnstileToken at the edge", () => {
  beforeEach(() => {
    invoke.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("uses the file Worker and skips the function", async () => {
    const fetchMock = vi.fn(async () =>
      jsonRes({ ok: true, hostname: "freluxtools.com" }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const { verifyTurnstileToken } = await loadWithEdge();

    await expect(verifyTurnstileToken("token", "contact")).resolves.toEqual({
      ok: true,
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [target, init] = fetchMock.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(target).toBe(`${EDGE}/api/turnstile`);
    expect(JSON.parse(String(init.body))).toEqual({
      token: "token",
      action: "contact",
    });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("falls back to the function when the edge is not configured there", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonRes({ ok: false, reason: "not-configured" }, 503)),
    );
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    const { verifyTurnstileToken } = await loadWithEdge();

    await expect(verifyTurnstileToken("token", "contact")).resolves.toEqual({
      ok: true,
    });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("falls back when the edge cannot be reached", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    invoke.mockResolvedValue({ data: { ok: true }, error: null });
    const { verifyTurnstileToken } = await loadWithEdge();

    await expect(verifyTurnstileToken("token", "contact")).resolves.toEqual({
      ok: true,
    });
    expect(invoke).toHaveBeenCalledTimes(1);
  });

  it("carries the edge refusal without spending the token twice", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonRes({ ok: false, reason: "action-mismatch" }, 403)),
    );
    const { verifyTurnstileToken } = await loadWithEdge();

    await expect(verifyTurnstileToken("token", "signup")).resolves.toEqual({
      ok: false,
      reason: "action-mismatch",
    });
    expect(invoke).not.toHaveBeenCalled();
  });

  it("treats an edge upstream failure as a network problem", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonRes({ ok: false, reason: "network" }, 502)),
    );
    const { verifyTurnstileToken } = await loadWithEdge();

    await expect(verifyTurnstileToken("token", "contact")).resolves.toEqual({
      ok: false,
      reason: "network",
    });
    expect(invoke).not.toHaveBeenCalled();
  });
});

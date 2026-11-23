import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { HOOKS } from "./api";
import worker, { type Env } from "./index";

const url = (path: string) => `https://files.example${path}`;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const makeEnv = (overrides: Partial<Env> = {}): Env => ({
  SUPABASE_URL: "https://project.supabase.co/",
  ALLOWED_ORIGINS: "https://freluxtools.com",
  PUBLIC_BASE_URL: "https://files.example",
  ...overrides,
});

const post = (path: string, body: unknown, env: Env, headers = {}) =>
  worker.fetch(
    new Request(url(path), {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body: JSON.stringify(body),
    }),
    env,
  );

afterEach(() => {
  vi.unstubAllGlobals();
  delete HOOKS.test;
});

describe("edge API", () => {
  it("reports the API surface in health", async () => {
    const env = makeEnv({
      TURNSTILE_SECRET: "secret",
      TURNSTILE_HOSTNAMES: "freluxtools.com",
      WEBHOOK_SECRET: "hook-secret",
    });
    const body = (await (
      await worker.fetch(new Request(url("/health")), env)
    ).json()) as { api: Record<string, boolean> };
    expect(body.api.turnstile).toBe(true);
    expect(body.api.gateway).toBe(true);
    expect(body.api.hooks).toBe(true);
    expect(body.api.imageResize).toBe(false);
  });

  it("says so instead of failing open when turnstile is unconfigured", async () => {
    const response = await post(
      "/api/turnstile",
      { token: "t", action: "contact" },
      makeEnv(),
    );
    expect(response.status).toBe(503);
    expect(((await response.json()) as { reason: string }).reason).toBe(
      "not-configured",
    );
  });

  it("accepts a token that matches the action and hostname", async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        seen.push(String(input));
        const form = String(init?.body ?? "");
        expect(form).toContain("secret=secret");
        expect(form).toContain("response=good-token");
        return jsonResponse({
          success: true,
          action: "contact",
          hostname: "freluxtools.com",
        });
      }),
    );

    const response = await post(
      "/api/turnstile",
      { token: "good-token", action: "contact" },
      makeEnv({
        TURNSTILE_SECRET: "secret",
        TURNSTILE_HOSTNAMES: "freluxtools.com",
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      ok: true,
      hostname: "freluxtools.com",
    });
    expect(seen[0]).toContain(
      "challenges.cloudflare.com/turnstile/v0/siteverify",
    );
  });

  it("rejects a token minted for a different action", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        jsonResponse({
          success: true,
          action: "signup",
          hostname: "freluxtools.com",
        }),
      ),
    );
    const response = await post(
      "/api/turnstile",
      { token: "token", action: "contact" },
      makeEnv({
        TURNSTILE_SECRET: "secret",
        TURNSTILE_HOSTNAMES: "freluxtools.com",
      }),
    );
    expect(response.status).toBe(403);
    expect(((await response.json()) as { reason: string }).reason).toBe(
      "action-mismatch",
    );
  });

  it("forwards a gateway call and keeps private headers here", async () => {
    let seenUrl = "";
    let seenHeaders: Headers | null = null;
    let seenBody = "";
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo, init?: RequestInit) => {
        seenUrl = String(input);
        seenHeaders = new Headers(init?.headers);
        seenBody = new TextDecoder().decode(init?.body as ArrayBuffer);
        return jsonResponse({ reply: "hi" }, 201);
      }),
    );

    const response = await worker.fetch(
      new Request(url("/api/fn/ai-livechat?x=1"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: "Bearer user-token",
          cookie: "session=secret",
          "cf-connecting-ip": "1.2.3.4",
        },
        body: JSON.stringify({ message: "hello" }),
      }),
      makeEnv(),
    );

    expect(response.status).toBe(201);
    expect(seenUrl).toBe(
      "https://project.supabase.co/functions/v1/ai-livechat?x=1",
    );
    expect(seenHeaders?.get("authorization")).toBe("Bearer user-token");
    expect(seenHeaders?.get("cookie")).toBeNull();
    expect(seenHeaders?.get("cf-connecting-ip")).toBeNull();
    expect(JSON.parse(seenBody)).toEqual({ message: "hello" });
    expect(await response.json()).toEqual({ reply: "hi" });
  });

  it("refuses a gateway name that is not a slug", async () => {
    const response = await worker.fetch(
      new Request(url("/api/fn/Ai_Livechat")),
      makeEnv(),
    );
    expect(response.status).toBe(404);
  });

  it("surfaces an unreachable upstream as a bad gateway", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new Error("offline");
      }),
    );
    // An unported name: `health` now runs on the Worker, so the proxy path is
    // exercised with a function that has not moved yet.
    const response = await worker.fetch(
      new Request(url("/api/fn/ai-livechat")),
      makeEnv(),
    );
    expect(response.status).toBe(502);
  });

  it("runs a ported function locally instead of proxying it", async () => {
    const spy = vi.fn(async () => new Response("[]", { status: 200 }));
    vi.stubGlobal("fetch", spy);
    const response = await worker.fetch(
      new Request(url("/api/fn/health")),
      makeEnv(),
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.runtime).toBe("cloudflare-workers");
    // The only fetch is the database probe, never a Supabase function call.
    for (const call of spy.mock.calls) {
      expect(String(call[0])).not.toContain("/functions/v1/");
    }
  });

  it("leaves the verdict to the function unless strict mode is on", async () => {
    HOOKS.test = "escrow-webhook";
    const secret = "hook-secret";
    const payload = JSON.stringify({ event: "paid" });
    const signature = createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ ok: true })),
    );

    const good = await worker.fetch(
      new Request(url("/api/hook/test"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-frelux-signature": `sha256=${signature}`,
        },
        body: payload,
      }),
      makeEnv({ WEBHOOK_SECRET: secret }),
    );
    expect(good.status).toBe(202);
    expect(await good.json()).toEqual({ received: true, status: 200 });

    // Default mode: the function holds the real secret and decides, so a
    // Worker copy that has drifted cannot reject genuine provider traffic.
    const forwarded = await worker.fetch(
      new Request(url("/api/hook/test"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-frelux-signature": `sha256=${"0".repeat(64)}`,
        },
        body: payload,
      }),
      makeEnv({ WEBHOOK_SECRET: secret }),
    );
    expect(forwarded.status).toBe(202);

    const bad = await worker.fetch(
      new Request(url("/api/hook/test"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-frelux-signature": `sha256=${"0".repeat(64)}`,
        },
        body: payload,
      }),
      makeEnv({ WEBHOOK_SECRET: secret }),
    );
    const strict = await worker.fetch(
      new Request(url("/api/hook/test"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-frelux-signature": `sha256=${"0".repeat(64)}`,
        },
        body: payload,
      }),
      makeEnv({ WEBHOOK_SECRET: secret, HOOK_STRICT: "on" }),
    );
    expect(strict.status).toBe(401);
    expect(bad.status).toBe(202);
  });

  it("leaves an unlisted hook inert", async () => {
    const response = await worker.fetch(
      new Request(url("/api/hook/unknown"), { method: "POST", body: "{}" }),
      makeEnv({ WEBHOOK_SECRET: "hook-secret" }),
    );
    expect(response.status).toBe(404);
  });
});

describe("hook relay header forwarding", () => {
  it("hands the provider's own signature to the function", async () => {
    // A relay that strips x-paystack-signature would forward unsigned traffic
    // and every real callback would be rejected downstream.
    const fetched: Request[] = [];
    const original = globalThis.fetch;
    globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
      fetched.push(new Request(input as string, init));
      return new Response("ok", { status: 200 });
    }) as typeof fetch;
    try {
      const { handleHook } = await import("./api");
      const secret = "sk_test_dummy";
      const body = JSON.stringify({ event: "charge.success" });
      const key = await crypto.subtle.importKey(
        "raw",
        new TextEncoder().encode(secret),
        { name: "HMAC", hash: "SHA-512" },
        false,
        ["sign"],
      );
      const digest = new Uint8Array(
        await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)),
      );
      const signature = [...digest]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      const response = await handleHook(
        new Request("https://files.freluxtools.com/api/hook/paystack", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-paystack-signature": signature,
          },
          body,
        }),
        {
          SUPABASE_URL: "https://example.supabase.co",
          PAYSTACK_SECRET_KEY: "sk_test_dummy",
        } as never,
        new URL("https://files.freluxtools.com/api/hook/paystack"),
        {},
      );
      expect(response.status).toBe(202);
      expect(fetched).toHaveLength(1);
      expect(fetched[0].headers.get("x-paystack-signature")).toBe(signature);
    } finally {
      globalThis.fetch = original;
    }
  });
});

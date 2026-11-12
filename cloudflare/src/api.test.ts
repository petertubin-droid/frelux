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
    const response = await worker.fetch(
      new Request(url("/api/fn/health")),
      makeEnv(),
    );
    expect(response.status).toBe(502);
  });

  it("relays a hook only with a correct signature", async () => {
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
    expect(bad.status).toBe(401);
  });

  it("leaves an unlisted hook inert", async () => {
    const response = await worker.fetch(
      new Request(url("/api/hook/unknown"), { method: "POST", body: "{}" }),
      makeEnv({ WEBHOOK_SECRET: "hook-secret" }),
    );
    expect(response.status).toBe(404);
  });
});

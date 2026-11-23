import { afterEach, describe, expect, it, vi } from "vitest";
import type { ApiEnv } from "../api";
import { verifyCopy } from "./verify-copy";

const env = (over: Partial<ApiEnv> = {}): ApiEnv => ({
  SUPABASE_URL: "https://project.supabase.co",
  SUPABASE_ANON_KEY: "anon",
  SUPABASE_SERVICE_ROLE_KEY: "service",
  ...over,
});

const cors = { "access-control-allow-origin": "*" };
const TOKEN = "abcdefghijklmnop";
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]);

const call = (
  opts: {
    method?: string;
    token?: string;
    auth?: string | null;
    contentType?: string;
    body?: Uint8Array;
  } = {},
) => {
  const headers: Record<string, string> = {
    "content-type": opts.contentType ?? "application/pdf",
  };
  const auth = opts.auth === undefined ? "Bearer jwt" : opts.auth;
  if (auth) headers.authorization = auth;
  const token = opts.token ?? TOKEN;
  const target = `https://files.example/api/fn/verify-copy?token=${token}`;
  const method = opts.method ?? "POST";
  return verifyCopy(
    new Request(target, {
      method,
      headers,
      ...(method === "GET" ? {} : { body: opts.body ?? PDF }),
    }),
    env(),
    new URL(target),
    cors,
  );
};

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

afterEach(() => vi.unstubAllGlobals());

describe("verify-copy (native)", () => {
  it("rejects non-POST methods", async () => {
    expect((await call({ method: "GET" })).status).toBe(405);
  });

  it("requires authentication", async () => {
    const res = await call({ auth: null });
    expect(res.status).toBe(401);
    expect(await res.json()).toEqual({ error: "AUTHENTICATION_REQUIRED" });
  });

  it("rejects a malformed token", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ id: "u1" })));
    const res = await call({ token: "NOPE" });
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: "INVALID_TOKEN" });
  });

  it("requires a PDF content type", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ id: "u1" })));
    expect((await call({ contentType: "image/png" })).status).toBe(415);
  });

  it("rejects bytes that are not a PDF", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ id: "u1" })));
    expect((await call({ body: new Uint8Array([0x50, 0x4b]) })).status).toBe(415);
  });

  it("404s an unknown token", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const u = String(input);
        if (u.includes("/auth/v1/user")) return jsonResponse({ id: "u1" });
        return jsonResponse([]);
      }),
    );
    const res = await call();
    expect(res.status).toBe(404);
    expect(await res.json()).toEqual({ error: "UNKNOWN_TOKEN" });
  });

  it("403s a record owned by someone else", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const u = String(input);
        if (u.includes("/auth/v1/user")) return jsonResponse({ id: "u1" });
        return jsonResponse([{ id: "r1", user_id: "u2" }]);
      }),
    );
    const res = await call();
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "NOT_YOUR_RECORD" });
  });

  it("uploads, stamps the record and returns the expiry", async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const u = String(input);
        seen.push(`${init?.method ?? "GET"} ${u.split("?")[0]}`);
        if (u.includes("/auth/v1/user")) return jsonResponse({ id: "u1" });
        if (u.includes("/storage/v1/object/verify-copies/")) return jsonResponse({});
        if (u.includes("/rest/v1/blockchain_document_records")) {
          if ((init?.method ?? "GET") === "GET")
            return jsonResponse([{ id: "r1", user_id: "u1" }]);
          return new Response(null, { status: 204 });
        }
        throw new Error(`unexpected ${u}`);
      }),
    );
    const res = await call();
    expect(res.status).toBe(200);
    const body = (await res.json()) as { success: boolean; expires_at: string };
    expect(body.success).toBe(true);
    expect(body.expires_at).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(seen).toContain(
      "POST https://project.supabase.co/storage/v1/object/verify-copies/abcdefghijklmnop.pdf",
    );
    expect(seen).toContain(
      "PATCH https://project.supabase.co/rest/v1/blockchain_document_records",
    );
  });

  it("removes the uploaded file when the record update fails", async () => {
    const seen: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const u = String(input);
        seen.push(`${init?.method ?? "GET"} ${u.split("?")[0]}`);
        if (u.includes("/auth/v1/user")) return jsonResponse({ id: "u1" });
        if (u.includes("/storage/v1/object/verify-copies/")) return jsonResponse({});
        if (u.endsWith("/storage/v1/object/verify-copies")) return jsonResponse({});
        if (u.includes("/rest/v1/blockchain_document_records")) {
          if ((init?.method ?? "GET") === "GET")
            return jsonResponse([{ id: "r1", user_id: "u1" }]);
          return jsonResponse({ message: "boom" }, 500);
        }
        throw new Error(`unexpected ${u}`);
      }),
    );
    const res = await call();
    expect(res.status).toBe(503);
    expect(await res.json()).toEqual({ error: "COPY_RECORD_FAILED" });
    expect(seen).toContain(
      "DELETE https://project.supabase.co/storage/v1/object/verify-copies",
    );
  });
});

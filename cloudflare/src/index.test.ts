import { createHmac } from "node:crypto";
import { describe, expect, it, vi } from "vitest";
import worker, { type Env } from "./index";

const SECRET = "test-jwt-secret";

const b64url = (value: string | Buffer) =>
  Buffer.from(value)
    .toString("base64")
    .replace(/=+$/, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

function token(sub: string, expSeconds = 3600): string {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = b64url(
    JSON.stringify({ sub, exp: Math.floor(Date.now() / 1000) + expSeconds }),
  );
  const signature = b64url(
    createHmac("sha256", SECRET).update(`${header}.${payload}`).digest(),
  );
  return `${header}.${payload}.${signature}`;
}

interface Stored {
  body: string;
  contentType: string;
}

/** Minimal R2 binding: enough to prove the routing and ownership rules. */
function makeBucket() {
  const objects = new Map<string, Stored>();
  return {
    objects,
    get: async (key: string) => {
      const found = objects.get(key);
      if (!found) return null;
      return {
        body: new Response(found.body).body as ReadableStream,
        size: found.body.length,
        httpEtag: `"${key.length}"`,
        httpMetadata: { contentType: found.contentType },
      };
    },
    delete: async (key: string) => {
      objects.delete(key);
    },
    put: async (
      key: string,
      value: ReadableStream,
      options?: { httpMetadata?: { contentType?: string } },
    ) => {
      const text = await new Response(value).text();
      objects.set(key, {
        body: text,
        contentType:
          options?.httpMetadata?.contentType ?? "application/octet-stream",
      });
    },
  };
}

const makeEnv = (): Env => ({
  SUPABASE_JWT_SECRET: SECRET,
  PUBLIC_BASE_URL: "https://files.example",
  ALLOWED_ORIGINS: "https://freluxtools.com",
  BUCKET_AVATARS: makeBucket(),
  BUCKET_MARKETPLACE: makeBucket(),
  BUCKET_PLAN_DOCUMENTS: makeBucket(),
});

const url = (path: string) => `https://files.example${path}`;

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

const upload = (
  env: Env,
  query: string,
  tokenValue: string | null,
  body = "pixels",
  type = "image/png",
) =>
  worker.fetch(
    new Request(url(`/files?${query}`), {
      method: "POST",
      headers: {
        "content-type": type,
        ...(tokenValue ? { authorization: `Bearer ${tokenValue}` } : {}),
      },
      body,
    }),
    env,
  );

describe("file worker", () => {
  it("reports health without leaking secrets", async () => {
    const response = await worker.fetch(new Request(url("/health")), makeEnv());
    const body = (await response.json()) as Record<string, unknown>;
    expect(body.ok).toBe(true);
    expect(body.uploadMode).toBe("binding");
    expect(body.stores).toContain("avatars");
    expect(JSON.stringify(body)).not.toContain(SECRET);
  });

  it("refuses an upload without a token", async () => {
    const response = await upload(
      makeEnv(),
      "bucket=avatars&filename=a.png",
      null,
    );
    expect(response.status).toBe(401);
  });

  it("refuses a forged token", async () => {
    const [header, payload] = token("user-1").split(".");
    const response = await upload(
      makeEnv(),
      "bucket=avatars&filename=a.png",
      `${header}.${payload}.deadbeef`,
    );
    expect(response.status).toBe(401);
  });

  it("stores an upload under the caller's prefix", async () => {
    const env = makeEnv();
    const response = await upload(
      env,
      "bucket=avatars&filename=logo.png",
      token("user-1"),
    );
    expect(response.status).toBe(201);

    const body = (await response.json()) as { key: string; publicUrl: string };
    expect(body.key).toMatch(
      /^user-1\/\d{4}-\d{2}-\d{2}\/[0-9a-f]{8}-logo\.png$/,
    );
    expect(body.publicUrl).toContain("/public/avatars/");
    expect(env.BUCKET_AVATARS?.objects.get(body.key)).toMatchObject({
      body: "pixels",
      contentType: "image/png",
    });
  });

  it("enforces the per-bucket content type list", async () => {
    const response = await upload(
      makeEnv(),
      "bucket=avatars&filename=doc.pdf",
      token("user-1"),
      "pdf",
      "application/pdf",
    );
    expect(response.status).toBe(415);
  });

  it("rejects a declared size over the bucket cap", async () => {
    const env = makeEnv();
    const response = await worker.fetch(
      new Request(url("/files?bucket=avatars&filename=big.png"), {
        method: "POST",
        headers: {
          "content-type": "image/png",
          authorization: `Bearer ${token("user-1")}`,
          "content-length": String(6 * 1024 * 1024),
        },
        body: "small",
      }),
      env,
    );
    expect(response.status).toBe(413);
  });

  it("serves the caller's own private file and hides everyone else's", async () => {
    const env = makeEnv();
    const created = (await (
      await upload(
        env,
        "bucket=marketplace&filename=quote.pdf",
        token("user-1"),
        "pdf",
        "application/pdf",
      )
    ).json()) as { key: string };

    const mine = await worker.fetch(
      new Request(url(`/files/marketplace/${created.key}`), {
        headers: { authorization: `Bearer ${token("user-1")}` },
      }),
      env,
    );
    expect(mine.status).toBe(200);
    expect(await mine.text()).toBe("pdf");

    const theirs = await worker.fetch(
      new Request(
        url(`/files/marketplace/${created.key}?token=${token("user-2")}`),
      ),
      env,
    );
    expect(theirs.status).toBe(404);
  });

  it("deletes the caller's own file and refuses anyone else's", async () => {
    const env = makeEnv();
    const created = (await (
      await upload(
        env,
        "bucket=marketplace&filename=quote.pdf",
        token("user-1"),
        "pdf",
        "application/pdf",
      )
    ).json()) as { key: string };

    const stranger = await worker.fetch(
      new Request(url(`/files/marketplace/${created.key}`), {
        method: "DELETE",
        headers: { authorization: `Bearer ${token("user-2")}` },
      }),
      env,
    );
    expect(stranger.status).toBe(404);
    expect(env.BUCKET_MARKETPLACE?.objects.has(created.key)).toBe(true);

    const owner = await worker.fetch(
      new Request(url(`/files/marketplace/${created.key}`), {
        method: "DELETE",
        headers: { authorization: `Bearer ${token("user-1")}` },
      }),
      env,
    );
    expect(owner.status).toBe(204);
    expect(env.BUCKET_MARKETPLACE?.objects.has(created.key)).toBe(false);
  });

  it("serves public buckets and keeps private ones closed", async () => {
    const env = makeEnv();
    const created = (await (
      await upload(env, "bucket=avatars&filename=me.png", token("user-1"))
    ).json()) as { key: string };

    const publicRead = await worker.fetch(
      new Request(url(`/public/avatars/${created.key}`)),
      env,
    );
    expect(publicRead.status).toBe(200);
    expect(publicRead.headers.get("cache-control")).toContain("immutable");

    const privateRead = await worker.fetch(
      new Request(url("/public/plan-documents/x.pdf")),
      env,
    );
    expect(privateRead.status).toBe(404);
  });

  it("answers 501 for presigning until R2 keys are configured", async () => {
    const response = await worker.fetch(
      new Request(url("/presign/upload"), {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${token("user-1")}`,
        },
        body: JSON.stringify({
          bucket: "avatars",
          filename: "a.png",
          contentType: "image/png",
          size: 10,
        }),
      }),
      makeEnv(),
    );
    expect(response.status).toBe(501);
    expect((await response.json()) as { mode: string }).toMatchObject({
      mode: "binding",
    });
  });

  it("answers CORS only for allowed origins", async () => {
    const allowed = await worker.fetch(
      new Request(url("/health"), {
        headers: { origin: "https://freluxtools.com" },
      }),
      makeEnv(),
    );
    expect(allowed.headers.get("access-control-allow-origin")).toBe(
      "https://freluxtools.com",
    );

    const denied = await worker.fetch(
      new Request(url("/health"), {
        headers: { origin: "https://evil.example" },
      }),
      makeEnv(),
    );
    expect(denied.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("token verification without a usable signing secret", () => {
  const envWithIntrospection = (): Env => ({
    ...makeEnv(),
    SUPABASE_JWT_SECRET: undefined,
    SUPABASE_URL: "https://project.supabase.co",
    SUPABASE_ANON_KEY: "anon-key",
  });

  it("accepts a token Supabase itself vouches for", async () => {
    const calls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        calls.push(String(input));
        return jsonResponse({ id: "user-42" });
      }),
    );

    const response = await upload(
      envWithIntrospection(),
      "bucket=avatars&filename=logo.png",
      token("ignored-because-no-secret"),
    );

    expect(response.status).toBe(201);
    const body = (await response.json()) as { key: string };
    expect(body.key.startsWith("user-42/")).toBe(true);
    expect(calls[0]).toBe("https://project.supabase.co/auth/v1/user");
    vi.unstubAllGlobals();
  });

  it("rejects a token Supabase refuses", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ message: "invalid claim" }, 401)),
    );

    const response = await upload(
      envWithIntrospection(),
      "bucket=avatars&filename=logo.png",
      "not-a-real-token",
    );

    expect(response.status).toBe(401);
    vi.unstubAllGlobals();
  });

  it("still tries the local signature first when a secret is configured", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    const response = await upload(
      makeEnv(),
      "bucket=avatars&filename=logo.png",
      token("user-7"),
    );

    expect(response.status).toBe(201);
    expect(fetchSpy).not.toHaveBeenCalled();
    vi.unstubAllGlobals();
  });
});

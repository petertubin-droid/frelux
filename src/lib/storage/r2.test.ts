import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  BUCKET_LIMITS,
  StorageError,
  createR2DownloadUrl,
  r2PublicUrl,
  r2WorkerUrl,
  storageDriver,
  uploadToR2,
} from "./r2";

const WORKER = "https://files.freluxtools.com";

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });

describe("storage configuration", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("defaults to Supabase until the driver is switched on", () => {
    vi.stubEnv("VITE_R2_WORKER_URL", "");
    vi.stubEnv("VITE_STORAGE_DRIVER", "");
    expect(storageDriver()).toBe("supabase");
    expect(r2WorkerUrl()).toBeNull();
  });

  it("only uses R2 when both the driver and the Worker URL are set", () => {
    vi.stubEnv("VITE_R2_WORKER_URL", `${WORKER}/`);
    vi.stubEnv("VITE_STORAGE_DRIVER", "supabase");
    expect(storageDriver()).toBe("supabase");

    vi.stubEnv("VITE_STORAGE_DRIVER", "r2");
    expect(storageDriver()).toBe("r2");
    expect(r2WorkerUrl()).toBe(WORKER);
  });

  it("builds public URLs only for the public buckets", () => {
    vi.stubEnv("VITE_R2_WORKER_URL", WORKER);
    expect(r2PublicUrl("avatars", "user-1/a.png")).toBe(
      `${WORKER}/public/avatars/user-1/a.png`,
    );
    expect(r2PublicUrl("plan-documents", "user-1/plan.pdf")).toBeNull();
  });
});

describe("uploadToR2", () => {
  beforeEach(() => {
    vi.stubEnv("VITE_R2_WORKER_URL", WORKER);
    vi.stubEnv("VITE_STORAGE_DRIVER", "r2");
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("posts the file to the Worker and returns the stored key", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(
        {
          bucket: "avatars",
          key: "user-9/2026-11-12/ab12cd34-logo.png",
          publicUrl: `${WORKER}/public/avatars/user-9/2026-11-12/ab12cd34-logo.png`,
        },
        201,
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["pixels"], "logo.png", { type: "image/png" });
    const result = await uploadToR2({
      bucket: "avatars",
      file,
      accessToken: "jwt-token",
    });

    expect(result.key).toBe("user-9/2026-11-12/ab12cd34-logo.png");
    expect(result.publicUrl).toContain("/public/avatars/");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${WORKER}/files?bucket=avatars&filename=logo.png`);
    expect(init.method).toBe("POST");
    expect(init.headers.authorization).toBe("Bearer jwt-token");
    expect(init.headers["content-type"]).toBe("image/png");
    expect(init.body).toBe(file);
  });

  it("rejects an oversized file before touching the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const oversized = new File(
      [new Uint8Array(BUCKET_LIMITS.avatars + 1)],
      "huge.png",
      { type: "image/png" },
    );

    await expect(
      uploadToR2({ bucket: "avatars", file: oversized, accessToken: "jwt" }),
    ).rejects.toBeInstanceOf(StorageError);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("surfaces the Worker's refusal with its status", async () => {
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            { error: "Unsupported content type for avatars: application/pdf" },
            415,
          ),
        ),
    );

    await expect(
      uploadToR2({
        bucket: "avatars",
        file: new File(["x"], "plan.pdf", { type: "application/pdf" }),
        accessToken: "jwt",
      }),
    ).rejects.toMatchObject({
      name: "StorageError",
      status: 415,
      message: expect.stringContaining("Unsupported content type"),
    });
  });

  it("fails loudly when no access token is available", async () => {
    vi.stubGlobal("fetch", vi.fn());
    await expect(
      uploadToR2({
        bucket: "avatars",
        file: new File(["x"], "a.png", { type: "image/png" }),
        accessToken: "",
      }),
    ).rejects.toMatchObject({ status: 401 });
  });
});

describe("createR2DownloadUrl", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("returns the presigned URL when the Worker can sign", async () => {
    vi.stubEnv("VITE_R2_WORKER_URL", WORKER);
    const fetchMock = vi
      .fn()
      .mockResolvedValue(
        jsonResponse({ url: "https://r2.example/signed", expiresIn: 300 }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      createR2DownloadUrl({
        bucket: "plan-documents",
        key: "user-1/2026-11-12/plan.pdf",
        accessToken: "jwt",
      }),
    ).resolves.toBe("https://r2.example/signed");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe(`${WORKER}/presign/download`);
    expect(JSON.parse(init.body)).toMatchObject({
      bucket: "plan-documents",
      key: "user-1/2026-11-12/plan.pdf",
    });
  });

  it("falls back to a token-carrying Worker URL when presigning is off", async () => {
    vi.stubEnv("VITE_R2_WORKER_URL", WORKER);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          jsonResponse(
            { error: "Presigning needs R2 keys", mode: "binding" },
            501,
          ),
        ),
    );

    await expect(
      createR2DownloadUrl({
        bucket: "pro-verification",
        key: "user-7/2026-11-12/id.pdf",
        accessToken: "jwt token",
      }),
    ).resolves.toBe(
      `${WORKER}/files/pro-verification/user-7/2026-11-12/id.pdf?token=jwt%20token`,
    );
  });
  it("reports a refusal instead of returning an empty URL", async () => {
    vi.stubEnv("VITE_R2_WORKER_URL", WORKER);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "Not found" }, 404)),
    );

    await expect(
      createR2DownloadUrl({
        bucket: "marketplace",
        key: "someone-else/file.pdf",
        accessToken: "jwt",
      }),
    ).rejects.toMatchObject({ status: 404, message: "Not found" });
  });
});

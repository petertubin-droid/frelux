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

  it("presigns, then PUTs the file straight to R2", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          key: "user-9/2026-11-12/ab12cd34-logo.png",
          uploadUrl:
            "https://r2.example/avatars/user-9/logo.png?X-Amz-Signature=x",
          publicUrl: `${WORKER}/public/avatars/user-9/2026-11-12/ab12cd34-logo.png`,
        }),
      )
      .mockResolvedValueOnce(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["pixels"], "logo.png", { type: "image/png" });
    const result = await uploadToR2({
      bucket: "avatars",
      file,
      accessToken: "jwt-token",
    });

    expect(result.key).toBe("user-9/2026-11-12/ab12cd34-logo.png");
    expect(result.publicUrl).toContain("/public/avatars/");

    const presignCall = fetchMock.mock.calls[0];
    expect(presignCall[0]).toBe(`${WORKER}/presign/upload`);
    expect(presignCall[1].headers.authorization).toBe("Bearer jwt-token");
    expect(JSON.parse(presignCall[1].body)).toMatchObject({
      bucket: "avatars",
      filename: "logo.png",
      contentType: "image/png",
      size: 6,
    });

    const putCall = fetchMock.mock.calls[1];
    expect(putCall[0]).toContain("X-Amz-Signature");
    expect(putCall[1].method).toBe("PUT");
    expect(putCall[1].headers["content-type"]).toBe("image/png");
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

  it("returns the signed URL from the Worker", async () => {
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

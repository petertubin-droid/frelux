import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSupabaseMock } from "@/lib/__mocks__/supabase-mock";

const supabase = createSupabaseMock();

vi.mock("@/lib/supabase", () => ({
  supabase,
  isSupabaseConfigured: true,
}));

const WORKER = "https://files.example";

const importFacade = async () => await import("@/lib/storage/files");

beforeEach(() => {
  vi.stubEnv("VITE_R2_WORKER_URL", WORKER);
  vi.stubEnv("VITE_STORAGE_DRIVER", "r2");
  supabase.auth.getSession.mockResolvedValue({
    data: { session: { access_token: "jwt-token" } },
    error: null,
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("storage facade", () => {
  it("keeps Supabase as the driver until R2 is switched on", async () => {
    vi.stubEnv("VITE_STORAGE_DRIVER", "");
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { uploadStoredFile } = await importFacade();

    const result = await uploadStoredFile({
      bucket: "brand-assets",
      file: new File(["x"], "logo.png", { type: "image/png" }),
      path: "user-1/logo.png",
      contentType: "image/png",
    });

    expect(result.error).toBeNull();
    expect(result.path).toBe("user-1/logo.png");
    expect(result.publicUrl).toBe("https://example.com/file.png");
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(supabase.storage.from).toHaveBeenCalledWith("brand-assets");
  });

  it("stores through the Worker on R2 and returns the key it chose", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            bucket: "plan-documents",
            key: "user-1/2026-11-12/ab12cd34-plan.pdf",
            publicUrl: null,
          }),
          { status: 201, headers: { "content-type": "application/json" } },
        ),
      ),
    );
    const { uploadStoredFile } = await importFacade();

    const result = await uploadStoredFile({
      bucket: "plan-documents",
      file: new File(["pdf"], "plan.pdf", { type: "application/pdf" }),
      path: "user-1/plan.pdf",
      contentType: "application/pdf",
    });

    expect(result).toMatchObject({
      path: "user-1/2026-11-12/ab12cd34-plan.pdf",
      publicUrl: null,
      error: null,
    });
    expect(supabase.storage.from).not.toHaveBeenCalled();
  });

  it("refuses an R2 upload when nobody is signed in", async () => {
    supabase.auth.getSession.mockResolvedValue({
      data: { session: null },
      error: null,
    });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const { uploadStoredFile } = await importFacade();

    const result = await uploadStoredFile({
      bucket: "pro-verification",
      file: new File(["id"], "id.pdf", { type: "application/pdf" }),
      path: "user-1/id.pdf",
    });

    expect(result.error).toMatch(/Sign in/);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("surfaces the Worker's refusal instead of a silent success", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ error: "Unsupported content type" }), {
          status: 415,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const { uploadStoredFile } = await importFacade();

    const result = await uploadStoredFile({
      bucket: "avatars",
      file: new File(["x"], "a.gif", { type: "image/gif" }),
      path: "user-1/a.gif",
      contentType: "image/gif",
    });

    expect(result.error).toBe("Unsupported content type");
  });

  it("mints a token link for a private read when presigning is off", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(JSON.stringify({ mode: "binding" }), {
          status: 501,
          headers: { "content-type": "application/json" },
        }),
      ),
    );
    const { signedUrlFor } = await importFacade();

    const result = await signedUrlFor(
      "pro-verification",
      "user-1/2026-11-12/id.pdf",
      300,
    );

    expect(result.error).toBeNull();
    expect(result.url).toBe(
      `${WORKER}/files/pro-verification/user-1/2026-11-12/id.pdf?token=jwt-token`,
    );
  });

  it("deletes through the Worker on R2 and through Supabase otherwise", async () => {
    const fetchSpy = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchSpy);
    const { removeStoredFile } = await importFacade();

    await removeStoredFile("pro-verification", "user-1/id.pdf");
    expect(fetchSpy).toHaveBeenCalledWith(
      `${WORKER}/files/pro-verification/user-1/id.pdf`,
      expect.objectContaining({ method: "DELETE" }),
    );

    vi.stubEnv("VITE_STORAGE_DRIVER", "");
    await removeStoredFile("pro-verification", "user-1/id.pdf");
    expect(supabase.storage.from).toHaveBeenCalledWith("pro-verification");
  });
});

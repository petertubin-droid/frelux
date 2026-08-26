import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    storage: {
      from: vi.fn(),
    },
  },
}));

import { uploadProductImage } from "./storage";
import { supabase } from "@/lib/supabase";

describe("storage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws if user is not logged in", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: null },
    } as any);

    await expect(uploadProductImage(new File([], "test.jpg"))).rejects.toThrow(
      "Must be logged in to upload",
    );
  });

  it("uploads file and returns public URL", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-123" } },
    } as any);

    const mockUpload = vi.fn().mockResolvedValue({ error: null });
    const mockGetPublicUrl = vi.fn().mockReturnValue({
      data: { publicUrl: "https://cdn.example.com/image.jpg" },
    });

    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    } as any);

    const file = new File(["content"], "photo.png", { type: "image/png" });
    const url = await uploadProductImage(file);
    expect(url).toBe("https://cdn.example.com/image.jpg");
    expect(mockUpload).toHaveBeenCalledOnce();
  });

  it("falls back to base64 when bucket not found", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-456" } },
    } as any);

    const mockUpload = vi.fn().mockResolvedValue({
      error: { message: "Bucket not found" },
    });

    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: vi.fn(),
    } as any);

    const file = new File(["test"], "img.jpg", { type: "image/jpeg" });
    const url = await uploadProductImage(file);
    expect(url).toContain("data:");
  });

  it("throws on non-bucket upload errors", async () => {
    vi.mocked(supabase.auth.getUser).mockResolvedValue({
      data: { user: { id: "user-789" } },
    } as any);

    vi.mocked(supabase.storage.from).mockReturnValue({
      upload: vi
        .fn()
        .mockResolvedValue({ error: { message: "Permission denied" } }),
      getPublicUrl: vi.fn(),
    } as any);

    const file = new File(["test"], "img.jpg");
    await expect(uploadProductImage(file)).rejects.toThrow("Permission denied");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const upload = vi.fn(async () => ({ error: null }));
const update = vi.fn(() => ({ error: null }));
const eq = vi.fn(() => ({ error: null }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => upload(...(args as [])),
        getPublicUrl: () => ({
          data: { publicUrl: "https://cdn.test/receipt.png" },
        }),
      }),
    },
    from: () => ({
      update: (...args: unknown[]) => {
        update(...(args as []));
        return { eq };
      },
    }),
  },
}));

const { uploadExpenseReceipt, RECEIPT_MAX_BYTES } =
  await import("@/lib/contractor");

const fileOf = (type: string, size: number, name = "receipt.png") => {
  const file = new File(["x"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

describe("receipt upload guard", () => {
  beforeEach(() => {
    upload.mockClear();
    update.mockClear();
    eq.mockClear();
  });

  it("accepts an image and stores it with a type derived name", async () => {
    const result = await uploadExpenseReceipt(
      "proj-1",
      "exp-1",
      fileOf("image/jpeg", 1024, "IMG_0421.JPG"),
    );
    expect(result.url).toBe("https://cdn.test/receipt.png");
    const [path] = upload.mock.calls[0] as unknown as [string];
    expect(path.startsWith("receipts/proj-1/exp-1-")).toBe(true);
    expect(path.endsWith(".jpg")).toBe(true);
  });

  it("refuses a file type the storage bucket should not host", async () => {
    await expect(
      uploadExpenseReceipt(
        "proj-1",
        "exp-1",
        fileOf("text/html", 512, "x.html"),
      ),
    ).rejects.toThrow(/JPG, PNG, WebP, HEIC/);
    expect(upload).not.toHaveBeenCalled();
  });

  it("refuses an oversized receipt before touching storage", async () => {
    await expect(
      uploadExpenseReceipt(
        "proj-1",
        "exp-1",
        fileOf("application/pdf", RECEIPT_MAX_BYTES + 1, "huge.pdf"),
      ),
    ).rejects.toThrow(/larger than 8 MB/);
    expect(upload).not.toHaveBeenCalled();
  });
});

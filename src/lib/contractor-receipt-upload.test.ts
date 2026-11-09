import { beforeEach, describe, expect, it, vi } from "vitest";

const upload = vi.fn(async () => ({ error: null }));
const sign = vi.fn(async () => ({
  data: { signedUrl: "https://signed.test/receipt" },
  error: null,
}));
const update = vi.fn(() => ({ error: null }));
const eq = vi.fn(() => ({ error: null }));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    storage: {
      from: () => ({
        upload: (...args: unknown[]) => upload(...(args as [])),
        createSignedUrl: (...args: unknown[]) => sign(...(args as [])),
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

const {
  uploadExpenseReceipt,
  createReceiptLink,
  RECEIPT_BUCKET,
  RECEIPT_MAX_BYTES,
} = await import("@/lib/contractor");

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

  it("stores the proof in the private bucket under the project folder", async () => {
    const result = await uploadExpenseReceipt(
      "proj-1",
      "exp-1",
      fileOf("image/jpeg", 1024, "IMG_0421.JPG"),
    );

    const [path] = upload.mock.calls[0] as unknown as [string];
    expect(RECEIPT_BUCKET).toBe("project-receipts");
    expect(path.startsWith("proj-1/")).toBe(true);
    expect(path.endsWith(".jpg")).toBe(true);
    expect(result.path).toBe(path);
    expect(result.name).toBe("IMG_0421.JPG");
    // the row records the private path and clears any legacy public link
    expect(update).toHaveBeenCalledWith({
      receipt_path: path,
      receipt_name: "IMG_0421.JPG",
      receipt_url: null,
    });
  });

  it("never asks storage for a public URL", async () => {
    await uploadExpenseReceipt(
      "proj-1",
      "exp-1",
      fileOf("application/pdf", 2048, "slip.pdf"),
    );
    expect(sign).not.toHaveBeenCalled();
  });

  it("mints a short lived signed link on demand", async () => {
    const link = await createReceiptLink("proj-1/abc.pdf");
    expect(link).toBe("https://signed.test/receipt");
    const [path, ttl] = sign.mock.calls[0] as unknown as [string, number];
    expect(path).toBe("proj-1/abc.pdf");
    expect(ttl).toBe(600);
  });

  it("fails loudly when a link cannot be minted", async () => {
    sign.mockResolvedValueOnce({
      data: null,
      error: { message: "not found" },
    } as never);
    await expect(createReceiptLink("proj-1/missing.pdf")).rejects.toThrow(
      /not found/,
    );
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

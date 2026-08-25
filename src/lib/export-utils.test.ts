import { describe, it, expect, vi, afterEach } from "vitest";
import {
  toCsv,
  downloadCsv,
  downloadJson,
  shareViaEmail,
} from "./export-utils";

describe("toCsv", () => {
  it("builds a header row and one row per record", () => {
    const csv = toCsv(
      [
        { name: "Paint", qty: 2 },
        { name: "Roller", qty: 1 },
      ],
      [
        { header: "Name", key: "name" },
        { header: "Qty", key: "qty" },
      ],
    );
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Name,Qty");
    expect(lines[1]).toBe("Paint,2");
    expect(lines[2]).toBe("Roller,1");
  });

  it("applies a custom format function per column", () => {
    const csv = toCsv(
      [{ price: 5000 }],
      [{ header: "Price", key: "price", format: (v) => `₦${v}` }],
    );
    expect(csv).toContain("₦5000");
  });

  it("quotes and escapes values containing commas or quotes", () => {
    const csv = toCsv(
      [{ name: 'Paint, 5L "Premium"' }],
      [{ header: "Name", key: "name" }],
    );
    expect(csv.split("\n")[1]).toBe('"Paint, 5L ""Premium"""');
  });

  it("handles missing values as empty strings", () => {
    const csv = toCsv([{}], [{ header: "Name", key: "name" }]);
    expect(csv.split("\n")[1]).toBe("");
  });
});

describe("downloadCsv / downloadJson", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a blob URL and triggers a click for CSV download", () => {
    const createObjectURL = vi.fn(() => "blob:csv");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const clickSpy = vi.fn();
    const anchor = {
      click: clickSpy,
      href: "",
      download: "",
    } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValue(anchor);

    downloadCsv("report", [{ a: 1 }], [{ header: "A", key: "a" }]);

    expect(createObjectURL).toHaveBeenCalled();
    expect(anchor.download).toBe("report.csv");
    expect(clickSpy).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:csv");
  });

  it("appends .json extension only if missing", () => {
    const createObjectURL = vi.fn(() => "blob:json");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });
    const anchor = {
      click: vi.fn(),
      href: "",
      download: "",
    } as unknown as HTMLAnchorElement;
    vi.spyOn(document, "createElement").mockReturnValue(anchor);

    downloadJson("data.json", { a: 1 });
    expect(anchor.download).toBe("data.json");
  });
});

describe("shareViaEmail", () => {
  it("opens a mailto link with subject and body encoded", () => {
    const openSpy = vi.spyOn(window, "open").mockImplementation(() => null);
    shareViaEmail("user@example.com", "My Quote", "Here is the quote");
    expect(openSpy).toHaveBeenCalledTimes(1);
    const url = openSpy.mock.calls[0][0] as string;
    expect(url.startsWith("mailto:user@example.com?")).toBe(true);
    expect(url).toContain("subject=My+Quote");
    openSpy.mockRestore();
  });
});

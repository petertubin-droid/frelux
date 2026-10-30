import { describe, expect, it, vi, afterEach } from "vitest";
import {
  buildCopyText,
  copyConfirmationText,
  copyText,
  type CopyBlock,
} from "./copy-results";

const block: CopyBlock = {
  title: "Tile estimate",
  subtitle: "Living room, 18.58 m²",
  lines: [
    { label: "Tiles required", value: "60 boxes" },
    { label: "Adhesive", value: "4 bags (20 kg)" },
  ],
  total: "Grand total: ₦185,000",
  sourceUrl: "https://freluxtools.com/tools/tile-calculator",
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("buildCopyText", () => {
  it("lays out one labelled row per line, with units intact", () => {
    expect(buildCopyText(block)).toBe(
      [
        "Tile estimate",
        "Living room, 18.58 m²",
        "",
        "Tiles required: 60 boxes",
        "Adhesive: 4 bags (20 kg)",
        "",
        "Grand total: ₦185,000",
        "",
        "https://freluxtools.com/tools/tile-calculator",
      ].join("\n"),
    );
  });

  it("keeps the units in every value so a number cannot be misread", () => {
    const text = buildCopyText({
      title: "Screeding",
      lines: [
        { label: "Volume", value: "0.93 m³" },
        { label: "Cement", value: "8 bags of 50 kg" },
      ],
    });
    expect(text).toContain("0.93 m³");
    expect(text).toContain("8 bags of 50 kg");
  });

  it("omits absent sections instead of leaving blank headings", () => {
    const text = buildCopyText({ title: "Paint", lines: [] });
    expect(text).toBe("Paint\n");
  });

  it("carries a note when the estimate needs one", () => {
    expect(
      buildCopyText({
        title: "Concrete",
        lines: [],
        note: "Prices exclude delivery.",
      }),
    ).toContain("Prices exclude delivery.");
  });
});

describe("copyText", () => {
  it("writes to the clipboard and says so", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyText("hello")).resolves.toBe("copied");
    expect(writeText).toHaveBeenCalledWith("hello");
  });

  it("reports a browser without the clipboard API", async () => {
    vi.stubGlobal("navigator", {});
    await expect(copyText("hello")).resolves.toBe("unsupported");
  });

  it("reports a refused clipboard write rather than pretending", async () => {
    const writeText = vi.fn().mockRejectedValue(new Error("denied"));
    vi.stubGlobal("navigator", { clipboard: { writeText } });
    await expect(copyText("hello")).resolves.toBe("failed");
  });

  it("refuses to copy nothing", async () => {
    await expect(copyText("")).resolves.toBe("failed");
  });
});

describe("copyConfirmationText", () => {
  it("tells the truth for each outcome", () => {
    expect(copyConfirmationText("copied")).toBe("Copied to clipboard");
    expect(copyConfirmationText("unsupported")).toMatch(/not available/i);
    expect(copyConfirmationText("failed")).toMatch(/could not copy/i);
  });

  it("never uses an em dash", () => {
    (["copied", "unsupported", "failed"] as const).forEach((outcome) => {
      expect(copyConfirmationText(outcome)).not.toContain("—");
    });
  });
});

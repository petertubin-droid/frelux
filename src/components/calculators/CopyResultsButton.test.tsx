import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import CopyResultsButton from "./CopyResultsButton";

const block = {
  title: "Foundation estimate",
  lines: [
    { label: "Recommended width", value: "600 mm" },
    { label: "Concrete volume", value: "2.4 m³" },
  ],
  total: "Grand total: ₦420,000",
  sourceUrl: "https://freluxtools.com/foundation-calculator",
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("CopyResultsButton", () => {
  it("copies the labelled rows with their units", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    render(<CopyResultsButton block={block} />);
    fireEvent.click(
      screen.getByRole("button", { name: /copy foundation estimate/i }),
    );

    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
    const text = writeText.mock.calls[0][0] as string;
    expect(text).toContain("Recommended width: 600 mm");
    expect(text).toContain("Concrete volume: 2.4 m³");
    expect(text).toContain("Grand total: ₦420,000");
    expect(text).toContain("https://freluxtools.com/foundation-calculator");
  });

  it("confirms once the text is on the clipboard", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
    });
    render(<CopyResultsButton block={block} />);
    fireEvent.click(
      screen.getByRole("button", { name: /copy foundation estimate/i }),
    );
    expect(await screen.findByText(/copied to clipboard/i)).toBeInTheDocument();
  });

  it("admits when the browser has no clipboard", async () => {
    vi.stubGlobal("navigator", {});
    render(<CopyResultsButton block={block} />);
    fireEvent.click(
      screen.getByRole("button", { name: /copy foundation estimate/i }),
    );
    expect(
      await screen.findByText(/not available in this browser/i),
    ).toBeInTheDocument();
  });

  it("accepts a custom label", () => {
    render(<CopyResultsButton block={block} label="Send to client" />);
    expect(
      screen.getByRole("button", { name: /copy foundation estimate/i }),
    ).toHaveTextContent("Send to client");
  });
});

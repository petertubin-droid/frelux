import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ShareEstimateButton } from "./ShareEstimateButton";

vi.mock("@/lib/estimate-sharing", () => ({
  shareEstimateOnWhatsApp: vi.fn(),
  downloadEstimatePdf: vi.fn().mockResolvedValue(undefined),
  copyEstimateSummary: vi.fn().mockResolvedValue(true),
}));
import {
  shareEstimateOnWhatsApp,
  downloadEstimatePdf,
  copyEstimateSummary,
} from "@/lib/estimate-sharing";
import type { ShareableEstimate } from "@/lib/estimate-sharing";

const estimate: ShareableEstimate = {
  kind: "Tile Cost Estimate",
  summaryLines: [{ label: "Area", value: "42 m²" }],
  lineItems: [{ description: "Ceramic tiles", quantity: "14 packs", amount: "₦210,000" }],
  totals: [{ label: "Grand total", value: "₦254,500", emphasized: true }],
  link: "/tile-cost-estimator",
};

describe("ShareEstimateButton", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders nothing when there is no estimate yet", () => {
    const { container } = render(<ShareEstimateButton estimate={null} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("offers WhatsApp, PDF and copy actions", () => {
    render(<ShareEstimateButton estimate={estimate} />);
    expect(screen.getByText("WhatsApp")).toBeTruthy();
    expect(screen.getByText("Save PDF")).toBeTruthy();
    expect(screen.getByText("Copy text")).toBeTruthy();
  });

  it("shares on WhatsApp using the estimate", () => {
    render(<ShareEstimateButton estimate={estimate} />);
    fireEvent.click(screen.getByText("WhatsApp"));
    expect(shareEstimateOnWhatsApp).toHaveBeenCalledWith(estimate);
  });

  it("generates the PDF on demand", async () => {
    render(<ShareEstimateButton estimate={estimate} />);
    fireEvent.click(screen.getByText("Save PDF"));
    await waitFor(() => expect(downloadEstimatePdf).toHaveBeenCalledWith(estimate));
  });

  it("copies the summary and confirms", async () => {
    render(<ShareEstimateButton estimate={estimate} />);
    fireEvent.click(screen.getByText("Copy text"));
    await waitFor(() => expect(copyEstimateSummary).toHaveBeenCalledWith(estimate));
    await waitFor(() => expect(screen.getByText("Copied!")).toBeTruthy());
  });

  it("reports a PDF failure honestly instead of pretending it saved", async () => {
    (downloadEstimatePdf as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("x"));
    render(<ShareEstimateButton estimate={estimate} />);
    fireEvent.click(screen.getByText("Save PDF"));
    await waitFor(() =>
      expect(screen.getByText(/PDF could not be generated/)).toBeTruthy(),
    );
  });

  it("renders the compact variant", () => {
    render(<ShareEstimateButton estimate={estimate} compact />);
    expect(screen.getByText("Copy")).toBeTruthy();
    expect(screen.queryByText("Copy text")).toBeNull();
  });
});

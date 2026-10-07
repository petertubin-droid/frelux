/**
 * Counter-Vision page tests (Future Engine 2)
 *
 * The counting validation is covered by
 * count-vision-engine.test.ts (20 tests). These pin the page
 * wiring: photo acceptance before upload, honest result display
 * per verdict, the never-stored photo contract, error surface,
 * and the ads/SEO contract.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CountVision from "./CountVision";

const countMock = vi.fn();

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));
vi.mock("@/lib/seo", () => ({
  useSeo: vi.fn(),
  useBreadcrumbJsonLd: vi.fn(() => null),
}));
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));
vi.mock("@/lib/estimation/queries", () => ({
  fetchCountVisionRules: vi.fn().mockResolvedValue({ data: [], error: null }),
  countPhoto: (...args: unknown[]) => countMock(...args),
}));

function makePhoto(size = 2 * 1024 * 1024, type = "image/jpeg"): File {
  return new File([new ArrayBuffer(size)], "site.jpg", { type });
}

function pickPhoto(file: File | null) {
  const input = screen.getByLabelText(
    /site photo to count/i,
  ) as HTMLInputElement;
  Object.defineProperty(input, "files", {
    value: file ? [file] : [],
    configurable: true,
  });
  fireEvent.change(input);
}

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <CountVision />
    </MemoryRouter>,
  );
}

describe("CountVision page", () => {
  it("states the photo rules up front: type, size, never stored", () => {
    renderPage();
    expect(screen.getAllByText(/never stored/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/up to 8 MB/i)).toBeInTheDocument();
  });

  it("refuses an oversized photo before any upload, with the limit named", () => {
    renderPage();
    pickPhoto(makePhoto(9 * 1024 * 1024));
    expect(screen.getByRole("alert").textContent).toMatch(/limit is 8 MB/);
    expect(countMock).not.toHaveBeenCalled();
  });

  it("refuses non-image files with the type named", () => {
    renderPage();
    pickPhoto(makePhoto(100 * 1024, "application/pdf"));
    expect(screen.getByRole("alert").textContent).toMatch(/not a photo/i);
    expect(countMock).not.toHaveBeenCalled();
  });

  it("counts a valid photo and shows the honest counted result with confidence", async () => {
    countMock.mockResolvedValue({
      verdict: "counted",
      count: 42,
      unitLabel: "bags",
      confidence: 0.92,
      reason: "Two neat rows of cement bags, all visible",
    });
    renderPage();
    pickPhoto(makePhoto(1.5 * 1024 * 1024));
    fireEvent.click(
      screen.getByRole("button", { name: /count what's visible/i }),
    );
    await waitFor(() => screen.getByTestId("count-result"));
    expect(screen.getByTestId("count-number").textContent).toBe("42");
    expect(screen.getByText(/bags visible in the photo/i)).toBeInTheDocument();
    expect(screen.getByText(/92%/)).toBeInTheDocument();
    // The honest visible-only caveat is always shown with a count
    expect(
      screen.getByText(/hidden behind or under the stack/i),
    ).toBeInTheDocument();
    expect(countMock).toHaveBeenCalledTimes(1);
  });

  it("shows an unclear verdict as a refusal with the reason: never a number", async () => {
    countMock.mockResolvedValue({
      verdict: "unclear",
      count: null,
      unitLabel: "bags",
      confidence: 0.3,
      reason: "The stack is too deep: hidden layers cannot be counted",
    });
    renderPage();
    pickPhoto(makePhoto());
    fireEvent.click(
      screen.getByRole("button", { name: /count what's visible/i }),
    );
    await waitFor(() => screen.getByTestId("count-result"));
    expect(
      screen.getAllByText(/cannot be counted honestly/i).length,
    ).toBeGreaterThan(0);
    expect(screen.getAllByText(/hidden layers/i).length).toBeGreaterThan(0);
    expect(screen.queryByTestId("count-number")).not.toBeInTheDocument();
  });

  it("shows not_found as what it is: no countable materials", async () => {
    countMock.mockResolvedValue({
      verdict: "not_found",
      count: null,
      unitLabel: null,
      confidence: 0.8,
      reason: "This photo shows a room, not stacked materials.",
    });
    renderPage();
    pickPhoto(makePhoto());
    fireEvent.click(
      screen.getByRole("button", { name: /count what's visible/i }),
    );
    await waitFor(() => screen.getByTestId("count-result"));
    expect(screen.getByText(/no countable materials/i)).toBeInTheDocument();
    expect(screen.queryByTestId("count-number")).not.toBeInTheDocument();
  });

  it("a server-fabricated low-confidence count is refused by the client gate too", async () => {
    // The server says "counted" at 0.4 confidence - the page must
    // still refuse to show it as a number (client-side second gate).
    countMock.mockResolvedValue({
      verdict: "counted",
      count: 15,
      unitLabel: "tiles",
      confidence: 0.4,
      reason: "Tiles are partially blurred",
    });
    renderPage();
    pickPhoto(makePhoto());
    fireEvent.click(
      screen.getByRole("button", { name: /count what's visible/i }),
    );
    await waitFor(() => screen.getByTestId("count-result"));
    expect(
      screen.getAllByText(/cannot be counted honestly/i).length,
    ).toBeGreaterThan(0);
    expect(screen.queryByTestId("count-number")).not.toBeInTheDocument();
  });

  it("a transport failure is honest about the photo not being stored", async () => {
    countMock.mockRejectedValue(new Error("Network down"));
    renderPage();
    pickPhoto(makePhoto());
    fireEvent.click(
      screen.getByRole("button", { name: /count what's visible/i }),
    );
    await waitFor(() => screen.getByRole("alert"));
    expect(screen.getByRole("alert").textContent).toMatch(
      /photo was not stored/i,
    );
  });

  it("the photo is cleared after a successful count: the count is the record", async () => {
    countMock.mockResolvedValue({
      verdict: "counted",
      count: 5,
      unitLabel: "bags",
      confidence: 0.9,
      reason: "Five bags in one row",
    });
    renderPage();
    pickPhoto(makePhoto());
    await waitFor(() => screen.getByAltText(/ready for counting/i));
    fireEvent.click(
      screen.getByRole("button", { name: /count what's visible/i }),
    );
    await waitFor(() => screen.getByTestId("count-result"));
    expect(
      screen.queryByAltText(/ready for counting/i),
    ).not.toBeInTheDocument();
    expect(screen.getByText(/count what's visible/i)).toBeDisabled();
  });
});

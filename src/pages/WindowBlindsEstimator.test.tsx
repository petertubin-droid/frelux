import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import WindowBlindsEstimator from "@/pages/WindowBlindsEstimator";

vi.mock("@/lib/seo", () => ({ useSeo: vi.fn() }));
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

const renderPage = () =>
  render(
    <MemoryRouter>
      <WindowBlindsEstimator />
    </MemoryRouter>,
  );

/** The page renders one "How many" quantity input per opening row. */
const rows = () => screen.queryAllByLabelText("How many");

const taxField = () =>
  screen.getByPlaceholderText("VAT or sales tax") as HTMLInputElement;

beforeEach(() => {
  vi.clearAllMocks();
});

describe("WindowBlindsEstimator", () => {
  it("places the page in Home Decor and links up to the category", () => {
    renderPage();
    const categoryLink = screen
      .getAllByRole("link")
      .find((a) => a.getAttribute("href") === "/tools/interiors");
    expect(categoryLink).toBeTruthy();
    expect(screen.getAllByText("Home Decor").length).toBeGreaterThan(0);
  });

  it("leaves tax unapplied when no rate is entered", () => {
    renderPage();
    expect(taxField().value).toBe("");
    expect(
      screen.getByText(/tax is not applied until you enter a rate/i),
    ).toBeTruthy();
    expect(screen.queryByText(/total including tax/i)).toBeNull();
  });

  it("shows a tax line and a total including tax once a rate is typed", () => {
    renderPage();
    fireEvent.change(taxField(), { target: { value: "7.5" } });
    expect(screen.getAllByText(/tax at 7.5 percent/i).length).toBeGreaterThan(
      0,
    );
    expect(screen.getAllByText(/total including tax/i).length).toBeGreaterThan(
      0,
    );
  });

  it("treats a job as a schedule of openings", () => {
    renderPage();
    const before = rows().length;
    expect(before).toBeGreaterThan(0);
    fireEvent.click(screen.getByRole("button", { name: /add opening/i }));
    expect(rows().length).toBe(before + 1);
    const removers = screen.getAllByRole("button", { name: /^remove/i });
    fireEvent.click(removers[removers.length - 1]);
    expect(rows().length).toBe(before);
  });

  it("offers cassette and old-blind removal per opening", () => {
    renderPage();
    // One pair of toggles per row, so the extras cannot be charged job-wide.
    expect(screen.getAllByLabelText("Cassette").length).toBe(rows().length);
    expect(screen.getAllByLabelText("Remove old").length).toBe(rows().length);
  });

  it("explains how each figure was reached", () => {
    renderPage();
    expect(screen.getByText("How this was worked out")).toBeTruthy();
  });
});

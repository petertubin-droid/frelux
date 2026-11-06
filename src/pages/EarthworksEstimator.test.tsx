import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EarthworksEstimator from "./EarthworksEstimator";
vi.mock("@/lib/seo", () => ({ useSeo: vi.fn() }));
// Ad slots in the page call useAuth, which needs the app provider at runtime.
const downloadCsv = vi.fn();
vi.mock("@/lib/export-utils", () => ({
  downloadCsv: (...args: unknown[]) => downloadCsv(...args),
}));
vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false, isPaid: false })),
}));

describe("EarthworksEstimator page", () => {
  it("calculates from entered cross sections and refuses missing survey/factor inputs", () => {
    render(
      <MemoryRouter>
        <EarthworksEstimator />
      </MemoryRouter>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Calculate cut & fill/i }),
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      /Enter every station chainage/,
    );
    const values = [
      ["Station 1 Chainage (m)", "0"],
      ["Station 1 Cut area (m²)", "2"],
      ["Station 1 Fill area (m²)", "1"],
      ["Station 2 Chainage (m)", "10"],
      ["Station 2 Cut area (m²)", "4"],
      ["Station 2 Fill area (m²)", "3"],
    ];
    for (const [label, value] of values)
      fireEvent.change(screen.getByRole("spinbutton", { name: label }), {
        target: { value },
      });
    const factors = screen.getAllByPlaceholderText("Enter verified factor");
    fireEvent.change(factors[0], { target: { value: "20" } });
    fireEvent.change(factors[1], { target: { value: "10" } });
    fireEvent.click(
      screen.getByRole("button", { name: /Calculate cut & fill/i }),
    );
    expect(screen.getByText("30 m³")).toBeInTheDocument();
    expect(screen.getByText("20 m³")).toBeInTheDocument();
    expect(
      screen.getByText(/No cut\/fill reuse balance is claimed/),
    ).toBeInTheDocument();
  });

  it("exports the summary, the intervals and the factors that produced them", () => {
    downloadCsv.mockClear();
    render(
      <MemoryRouter>
        <EarthworksEstimator />
      </MemoryRouter>,
    );
    const values = [
      ["Station 1 Chainage (m)", "0"],
      ["Station 1 Cut area (m²)", "2"],
      ["Station 1 Fill area (m²)", "1"],
      ["Station 2 Chainage (m)", "10"],
      ["Station 2 Cut area (m²)", "4"],
      ["Station 2 Fill area (m²)", "3"],
    ];
    for (const [label, value] of values)
      fireEvent.change(screen.getByRole("spinbutton", { name: label }), {
        target: { value },
      });
    const factors = screen.getAllByPlaceholderText("Enter verified factor");
    fireEvent.change(factors[0], { target: { value: "20" } });
    fireEvent.change(factors[1], { target: { value: "10" } });
    fireEvent.click(
      screen.getByRole("button", { name: /Calculate cut & fill/i }),
    );
    fireEvent.click(screen.getByRole("button", { name: /Export CSV/i }));

    expect(downloadCsv).toHaveBeenCalledTimes(1);
    const [filename, rows, columns] = downloadCsv.mock.calls[0] as [
      string,
      Record<string, unknown>[],
      Array<{ header: string; key: string }>,
    ];
    expect(filename).toContain("earthworks");
    const sections = rows.map((r) => r.section);
    expect(sections).toContain("Summary");
    expect(sections).toContain("Interval");
    expect(sections).toContain("Input");
    // The survey chainage travels with the interval, so the row can be checked.
    const interval = rows.find((r) => r.section === "Interval");
    expect(interval?.from).toBe(0);
    expect(interval?.to).toBe(10);
    expect(interval?.cut).toBe(30);
    expect(interval?.fill).toBe(20);
    // The factors are part of the record, not only the page.
    const inputs = rows.filter((r) => r.section === "Input");
    expect(inputs.map((r) => `${r.item}=${r.value}`)).toEqual([
      "Bulking factor=20",
      "Shrinkage factor=10",
      "Cut suitable for fill=no",
    ]);
    expect(columns.map((c) => c.header)).toContain("Cut (m3)");
  });
});

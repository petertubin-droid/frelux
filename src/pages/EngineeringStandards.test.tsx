import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EngineeringStandards from "@/pages/EngineeringStandards";

function renderPage() {
  return render(
    <MemoryRouter>
      <EngineeringStandards />
    </MemoryRouter>,
  );
}

describe("EngineeringStandards public page", () => {
  it("explains scope without presenting inventory counts as verification claims", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: "Engineering & Accuracy" }),
    ).toBeInTheDocument();
    expect(screen.queryByText(/not a passing-test count/i)).toBeNull();
    expect(screen.getByText(/not a completeness score/i)).toBeInTheDocument();
    expect(screen.getByText(/not certification/i)).toBeInTheDocument();
  });

  it("filters tools by a referenced standard", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText("Filter by referenced standard"), {
      target: { value: "BS 8666:2020" },
    });
    expect(
      screen.getByRole("heading", { name: "Reinforcement takeoff" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Paint calculator" }),
    ).toBeNull();
  });

  it("keeps internal tooling out of public listings", () => {
    renderPage();
    expect(
      screen.queryByText(/scraper|rate limiter|internal studio/i),
    ).toBeNull();
  });
});

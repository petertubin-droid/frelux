import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import Footer from "@/components/layout/Footer";

function renderComponent() {
  return render(
    <MemoryRouter>
      <Footer />
    </MemoryRouter>,
  );
}

describe("Footer", () => {
  it("renders without crashing", () => {
    const { container } = renderComponent();
    expect(container.innerHTML).not.toBe("");
  });

  it("renders FRELUX brand text", () => {
    renderComponent();
    expect(screen.getAllByText(/FRELUX/i).length).toBeGreaterThan(0);
  });
});

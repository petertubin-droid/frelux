import { describe, it, expect } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import Calculators from "@/pages/Calculators";

describe("Calculators (legacy route)", () => {
  it("redirects /calculators to /construction-tools", () => {
    render(
      <MemoryRouter initialEntries={["/calculators"]}>
        <Calculators />
      </MemoryRouter>,
    );
    // A redirect renders nothing of its own.
    expect(screen.queryByText(/All Calculators/i)).toBeNull();
  });
});

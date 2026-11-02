import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { NearbySuppliersLink } from "./NearbySuppliersLink";

// The entry point from a finished calculation to the map. A wrong layer or
// an unencoded material would silently send the user to an unfiltered map,
// so both parts of the href are asserted.
function renderLink(props: Parameters<typeof NearbySuppliersLink>[0]) {
  return render(
    <MemoryRouter>
      <NearbySuppliersLink {...props} />
    </MemoryRouter>,
  );
}

describe("NearbySuppliersLink", () => {
  it("opens the materials layer pre-filtered by what was calculated", () => {
    renderLink({ material: "POP ceiling materials" });
    const link = screen.getByRole("link", { name: /find suppliers near you/i });
    expect(link).toHaveAttribute(
      "href",
      "/map?layer=materials&q=POP%20ceiling%20materials",
    );
  });

  it("keeps the default label unless a caller overrides it", () => {
    renderLink({ material: "paint", label: "See paint sellers" });
    expect(
      screen.getByRole("link", { name: /see paint sellers/i }),
    ).toBeInTheDocument();
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import AdminPageHeader from "./AdminPageHeader";

describe("AdminPageHeader", () => {
  it("renders the screen name as the page's only level-one heading", () => {
    render(<AdminPageHeader title="International Markets" />);
    const headings = screen.getAllByRole("heading", { level: 1 });
    expect(headings).toHaveLength(1);
    // The shared title reveals word by word, so assert on normalised text.
    expect(headings[0].textContent?.replace(/\s+/g, " ").trim()).toBe(
      "International Markets",
    );
  });

  it("carries the module label, description and meta facts", () => {
    render(
      <AdminPageHeader
        eyebrow="Construction engines"
        title="Material Price Tracker"
        description="Manage current material prices."
        meta={[
          { label: "Materials", value: 128 },
          { label: "Last sync", value: "2 hours ago" },
        ]}
      />,
    );

    expect(screen.getByText("Construction engines")).toBeInTheDocument();
    expect(
      screen.getByText("Manage current material prices."),
    ).toBeInTheDocument();
    expect(screen.getByText("Materials")).toBeInTheDocument();
    expect(screen.getByText("128")).toBeInTheDocument();
    expect(screen.getByText("2 hours ago")).toBeInTheDocument();
  });

  it("renders actions beside the title when supplied", () => {
    render(
      <AdminPageHeader
        title="Rewards"
        actions={<button type="button">Export</button>}
      />,
    );
    expect(screen.getByRole("button", { name: "Export" })).toBeInTheDocument();
  });

  it("omits the meta row entirely when there is nothing to show", () => {
    const { container } = render(<AdminPageHeader title="Gallery" />);
    expect(container.querySelector("dl")).toBeNull();
  });
});

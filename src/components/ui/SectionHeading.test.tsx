import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import SectionHeading from "@/components/ui/SectionHeading";

describe("SectionHeading", () => {
  it("renders title", () => {
    render(<SectionHeading title="My Section" />);
    expect(screen.getByRole("heading")).toBeTruthy();
    expect(screen.getByText("My Section")).toBeTruthy();
  });

  it("renders label when provided", () => {
    render(<SectionHeading title="My Section" label="FEATURES" />);
    expect(screen.getByText("FEATURES")).toBeTruthy();
  });

  it("renders subtitle when provided", () => {
    render(<SectionHeading title="My Section" subtitle="A subtitle" />);
    expect(screen.getByText("A subtitle")).toBeTruthy();
  });

  it("heading has aria-level 2", () => {
    render(<SectionHeading title="My Section" />);
    expect(screen.getByRole("heading").getAttribute("aria-level")).toBe("2");
  });

  it("does not render label when not provided", () => {
    render(<SectionHeading title="My Section" />);
    expect(screen.queryByText("FEATURES")).toBeNull();
  });
});

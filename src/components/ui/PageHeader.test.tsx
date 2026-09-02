import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import PageHeader from "@/components/ui/PageHeader";

function renderHeader(props: Parameters<typeof PageHeader>[0]) {
  return render(
    <MemoryRouter>
      <PageHeader {...props} />
    </MemoryRouter>,
  );
}

describe("PageHeader", () => {
  it("renders title", () => {
    renderHeader({ title: "My Page" });
    expect(screen.getByText("My Page")).toBeTruthy();
  });

  it("renders subtitle when provided", () => {
    renderHeader({ title: "My Page", subtitle: "A description" });
    expect(screen.getByText("A description")).toBeTruthy();
  });

  it("renders eyebrow when provided", () => {
    renderHeader({ title: "My Page", eyebrow: "Section" });
    expect(screen.getByText("Section")).toBeTruthy();
  });

  it("renders back link when backTo provided", () => {
    renderHeader({ title: "My Page", backTo: "/home", backLabel: "Home" });
    const link = screen.getByText("Home");
    expect(link.closest("a")?.getAttribute("href")).toBe("/home");
  });

  it("uses default Back label when backLabel not provided", () => {
    renderHeader({ title: "My Page", backTo: "/home" });
    expect(screen.getByText("Back")).toBeTruthy();
  });

  it("renders breadcrumbs when provided", () => {
    renderHeader({
      title: "My Page",
      breadcrumbs: [
        { label: "Home", path: "/" },
        { label: "Section", path: "/s" },
        { label: "Current" },
      ],
    });
    expect(screen.getByText("Home")).toBeTruthy();
    expect(screen.getByText("Section")).toBeTruthy();
    expect(screen.getByText("Current")).toBeTruthy();
  });

  it("renders actions when provided", () => {
    renderHeader({ title: "My Page", actions: <button>Click me</button> });
    expect(screen.getByText("Click me")).toBeTruthy();
  });

  it("does not render back link when backTo not provided", () => {
    renderHeader({ title: "My Page" });
    expect(screen.queryByText("Back")).toBeNull();
  });
});

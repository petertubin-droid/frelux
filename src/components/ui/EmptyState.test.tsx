import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import EmptyState from "@/components/ui/EmptyState";

function renderEmpty(props: Parameters<typeof EmptyState>[0]) {
  return render(
    <MemoryRouter>
      <EmptyState {...props} />
    </MemoryRouter>,
  );
}

describe("EmptyState", () => {
  it("renders title and description", () => {
    renderEmpty({
      title: "No projects yet",
      description: "Get started by creating one",
    });
    expect(screen.getByText("No projects yet")).toBeTruthy();
    expect(screen.getByText("Get started by creating one")).toBeTruthy();
  });

  it("renders SVG illustration", () => {
    const { container } = renderEmpty({ title: "Empty", description: "Desc" });
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("renders action link when actionLabel and actionTo provided", () => {
    renderEmpty({
      title: "Empty",
      description: "Desc",
      actionLabel: "Create",
      actionTo: "/new",
    });
    const link = screen.getByText("Create");
    expect(link.closest("a")?.getAttribute("href")).toBe("/new");
  });

  it("renders action button when actionLabel and onAction provided", () => {
    const onAction = vi.fn();
    renderEmpty({
      title: "Empty",
      description: "Desc",
      actionLabel: "Click me",
      onAction,
    });
    fireEvent.click(screen.getByText("Click me"));
    expect(onAction).toHaveBeenCalled();
  });

  it("renders secondary link when provided", () => {
    renderEmpty({
      title: "Empty",
      description: "Desc",
      actionLabel: "Primary",
      actionTo: "/p",
      secondaryLabel: "Secondary",
      secondaryTo: "/s",
    });
    expect(
      screen.getByText("Secondary").closest("a")?.getAttribute("href"),
    ).toBe("/s");
  });

  it("does not render actions section when no labels provided", () => {
    renderEmpty({ title: "Empty", description: "Desc" });
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("applies custom className", () => {
    const { container } = renderEmpty({
      title: "Empty",
      description: "Desc",
      className: "my-class",
    });
    expect(container.firstChild).toBeTruthy();
  });
});

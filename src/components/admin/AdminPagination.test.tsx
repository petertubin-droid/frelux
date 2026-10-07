import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import AdminPagination from "./AdminPagination";

function setup(
  overrides: Partial<React.ComponentProps<typeof AdminPagination>> = {},
) {
  const onPageChange = vi.fn();
  const onPageSizeChange = vi.fn();
  render(
    <AdminPagination
      page={0}
      pageSize={10}
      total={95}
      onPageChange={onPageChange}
      onPageSizeChange={onPageSizeChange}
      {...overrides}
    />,
  );
  return { onPageChange, onPageSizeChange };
}

describe("AdminPagination", () => {
  it("shows the showing range and total", () => {
    setup();
    expect(screen.getByText("Showing 1\u201310 of 95")).toBeTruthy();
  });

  it("shows the correct range on later pages", () => {
    setup({ page: 9, total: 95 });
    expect(screen.getByText("Showing 91\u201395 of 95")).toBeTruthy();
  });

  it("handles an empty list", () => {
    setup({ total: 0 });
    expect(screen.getByText("Showing 0\u20130 of 0")).toBeTruthy();
  });

  it("navigates with prev/next", () => {
    const { onPageChange } = setup({ page: 1, total: 95 });
    fireEvent.click(screen.getByLabelText("Previous page"));
    expect(onPageChange).toHaveBeenCalledWith(0);
    fireEvent.click(screen.getByLabelText("Next page"));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("goes to a page number directly", () => {
    const { onPageChange } = setup({ total: 95 });
    fireEvent.click(screen.getByRole("button", { name: "Page 3" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("marks the current page", () => {
    setup({ page: 1, total: 95 });
    expect(screen.getByLabelText("Page 2").getAttribute("aria-current")).toBe(
      "page",
    );
  });

  it("changes the page size", () => {
    const { onPageSizeChange } = setup();
    fireEvent.change(screen.getByLabelText("Rows per page"), {
      target: { value: "50" },
    });
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it("disables prev on the first page", () => {
    setup({ page: 0, total: 95 });
    expect(screen.getByLabelText("Previous page")).toBeDisabled();
    expect(screen.getByLabelText("Next page")).not.toBeDisabled();
  });

  it("disables next on the last page", () => {
    const { container } = render(
      <AdminPagination
        page={9}
        pageSize={10}
        total={95}
        onPageChange={() => {}}
      />,
    );
    const next = container.querySelector(
      '[aria-label="Next page"]',
    ) as HTMLButtonElement;
    const prev = container.querySelector(
      '[aria-label="Previous page"]',
    ) as HTMLButtonElement;
    expect(next.disabled).toBe(true);
    expect(prev.disabled).toBe(false);
  });

  it("clamps a page that is beyond the total", () => {
    setup({ page: 50, total: 95 });
    expect(screen.getByText("Showing 91\u201395 of 95")).toBeTruthy();
  });

  it("renders without a page-size selector when handler is absent", () => {
    setup({ onPageSizeChange: undefined });
    expect(screen.queryByLabelText("Rows per page")).toBeNull();
  });
});

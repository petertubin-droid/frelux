import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import StickyActionBar from "@/components/ui/StickyActionBar";

describe("StickyActionBar", () => {
  it("returns null when no actions provided", () => {
    const { container } = render(<StickyActionBar />);
    expect(container.firstChild).toBeNull();
  });

  it("renders toolbar with aria-label", () => {
    render(<StickyActionBar onSave={vi.fn()} />);
    expect(screen.getByRole("toolbar")).toBeTruthy();
    expect(screen.getByLabelText("Quick actions")).toBeTruthy();
  });

  it("renders Save button with default label", () => {
    render(<StickyActionBar onSave={vi.fn()} />);
    expect(screen.getByText("Save")).toBeTruthy();
  });

  it("renders Save button with custom label", () => {
    render(<StickyActionBar onSave={vi.fn()} saveLabel="Save to Project" />);
    expect(screen.getByText("Save to Project")).toBeTruthy();
  });

  it("renders all buttons when all handlers provided", () => {
    render(
      <StickyActionBar
        onSave={vi.fn()}
        onExport={vi.fn()}
        onShare={vi.fn()}
        onAskAi={vi.fn()}
        onRecalculate={vi.fn()}
      />,
    );
    expect(screen.getByText("Save")).toBeTruthy();
    expect(screen.getByText("Export")).toBeTruthy();
    expect(screen.getByText("Share")).toBeTruthy();
    expect(screen.getByText("Ask AI")).toBeTruthy();
    expect(screen.getByText("Recalculate")).toBeTruthy();
  });

  it("calls onSave when save button clicked", () => {
    const onSave = vi.fn();
    render(<StickyActionBar onSave={onSave} />);
    fireEvent.click(screen.getByText("Save"));
    expect(onSave).toHaveBeenCalled();
  });

  it("calls onExport when export button clicked", () => {
    const onExport = vi.fn();
    render(<StickyActionBar onExport={onExport} />);
    fireEvent.click(screen.getByText("Export"));
    expect(onExport).toHaveBeenCalled();
  });

  it("calls onShare when share button clicked", () => {
    const onShare = vi.fn();
    render(<StickyActionBar onShare={onShare} />);
    fireEvent.click(screen.getByText("Share"));
    expect(onShare).toHaveBeenCalled();
  });

  it("calls onRecalculate when recalculate button clicked", () => {
    const onRecalculate = vi.fn();
    render(<StickyActionBar onRecalculate={onRecalculate} />);
    fireEvent.click(screen.getByText("Recalculate"));
    expect(onRecalculate).toHaveBeenCalled();
  });
});

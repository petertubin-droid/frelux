import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import SaveTemplateModal from "@/components/templates/SaveTemplateModal";

beforeEach(() => {
  vi.clearAllMocks();
});

const defaultProps = {
  open: true,
  onClose: vi.fn(),
  calculatorType: "paint" as const,
  inputData: { area: 100 },
  onSave: vi.fn(),
  defaultName: "My Template",
};

function renderModal(overrides?: Record<string, unknown>) {
  return render(<SaveTemplateModal {...defaultProps} {...overrides} />);
}

describe("SaveTemplateModal", () => {
  it("renders modal when open is true", () => {
    renderModal();
    expect(screen.getByText("Save as Template")).toBeTruthy();
  });

  it("returns null when open is false", () => {
    const { container } = renderModal({ open: false });
    expect(container.innerHTML).toBe("");
  });

  it("renders form with name and description fields", () => {
    renderModal();
    // Labels aren't linked via htmlFor, so query by placeholder text
    expect(screen.getByPlaceholderText("e.g. 10×12 Living Room")).toBeTruthy();
    expect(
      screen.getByPlaceholderText("e.g. Living room with 2 coats, ceiling included"),
    ).toBeTruthy();
  });

  it("pre-fills name with defaultName", () => {
    renderModal();
    const nameInput = screen.getByDisplayValue("My Template");
    expect(nameInput.tagName).toBe("INPUT");
  });

  it("calls onClose when Cancel is clicked", () => {
    renderModal();
    fireEvent.click(screen.getByText("Cancel"));
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it("shows error when submitting without a name", async () => {
    renderModal({ defaultName: undefined });
    fireEvent.click(screen.getByText("Save Template"));
    expect(screen.getByText("Please enter a template name")).toBeTruthy();
  });

  it("calls onSave with name and description on submit", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderModal({ onSave, defaultName: "Test" });
    fireEvent.click(screen.getByText("Save Template"));
    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith("Test", undefined);
    });
  });

  it("shows saving state while saving", async () => {
    let resolveSave: () => void;
    const onSave = vi.fn(
      () => new Promise<void>((resolve) => { resolveSave = resolve; }),
    );
    renderModal({ onSave, defaultName: "Test" });
    fireEvent.click(screen.getByText("Save Template"));
    expect(screen.getByText("Saving...")).toBeTruthy();
    resolveSave!();
    await waitFor(() => {
      expect(screen.queryByText("Saving...")).toBeNull();
    });
  });

  it("closes modal after successful save", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();
    renderModal({ onSave, onClose, defaultName: "Test" });
    fireEvent.click(screen.getByText("Save Template"));
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("shows error message when save throws", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("Network error"));
    renderModal({ onSave, defaultName: "Test" });
    fireEvent.click(screen.getByText("Save Template"));
    await waitFor(() => {
      expect(screen.getByText("Network error")).toBeTruthy();
    });
  });

  it("closes when clicking the backdrop", () => {
    const onClose = vi.fn();
    renderModal({ onClose });
    const backdrop = screen.getByText("Save as Template").closest("div.fixed");
    if (backdrop) {
      fireEvent.click(backdrop);
      expect(onClose).toHaveBeenCalled();
    }
  });
});

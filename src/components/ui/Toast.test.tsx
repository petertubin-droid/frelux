import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, act, fireEvent } from "@testing-library/react";
import { ToastProvider, useToast } from "@/components/ui/Toast";

// Test consumer component
function TestConsumer() {
  const { success, warning, error, info, toast } = useToast();
  return (
    <div>
      <button onClick={() => success("Success!", "Well done")}>Success</button>
      <button onClick={() => warning("Warning!", "Be careful")}>Warning</button>
      <button onClick={() => error("Error!", "Something broke")}>Error</button>
      <button onClick={() => info("Info!", "FYI")}>Info</button>
      <button
        onClick={() => toast({ type: "info", title: "CustomToastTitle" })}
      >
        Custom
      </button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ToastProvider>
      <TestConsumer />
    </ToastProvider>,
  );
}

describe("Toast System", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("renders children", () => {
    renderWithProvider();
    expect(screen.getByText("Success")).toBeTruthy();
  });

  it("shows success toast with title and message", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("Success"));
    expect(screen.getByText("Success!")).toBeTruthy();
    expect(screen.getByText("Well done")).toBeTruthy();
  });

  it("shows warning toast", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("Warning"));
    expect(screen.getByText("Warning!")).toBeTruthy();
  });

  it("shows error toast", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("Error"));
    expect(screen.getByText("Error!")).toBeTruthy();
  });

  it("shows info toast", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("Info"));
    expect(screen.getByText("Info!")).toBeTruthy();
  });

  it("auto-removes toast after duration", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("Success"));
    expect(screen.getByText("Success!")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    expect(screen.queryByText("Success!")).toBeNull();
  });

  it("can be dismissed by clicking close button", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("Success"));
    expect(screen.getByText("Success!")).toBeTruthy();
    const alert = screen.getByRole("alert");
    const btn = alert.querySelector("button")!;
    fireEvent.click(btn);
    expect(screen.queryByText("Success!")).toBeNull();
  });

  it("toast has role alert for accessibility", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("Success"));
    expect(screen.getByRole("alert")).toBeTruthy();
  });

  it("supports custom toast via toast() method", () => {
    renderWithProvider();
    fireEvent.click(screen.getByText("Custom"));
    expect(screen.getByText("CustomToastTitle")).toBeTruthy();
  });

  it("accepts variant alias for type", () => {
    const TestVariant = () => {
      const { toast } = useToast();
      return (
        <button onClick={() => toast({ variant: "success", title: "Variant" })}>
          V
        </button>
      );
    };
    render(
      <ToastProvider>
        <TestVariant />
      </ToastProvider>,
    );
    fireEvent.click(screen.getByText("V"));
    expect(screen.getByText("Variant")).toBeTruthy();
  });
});

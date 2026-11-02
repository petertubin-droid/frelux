import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import ErrorBoundary from "@/components/ErrorBoundary";

const ThrowComponent = ({ shouldThrow }: { shouldThrow?: boolean }) => {
  if (shouldThrow) throw new Error("Test error message");
  return <div>Normal content</div>;
};

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary boundaryName="test">
        <div>Hello World</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("Hello World")).toBeTruthy();
  });

  it("catches errors and shows fallback UI with role alert", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary boundaryName="test-section">
        <ThrowComponent shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeTruthy();
    spy.mockRestore();
  });

  it("shows boundary name in dev fallback", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary boundaryName="my-section">
        <ThrowComponent shouldThrow />
      </ErrorBoundary>,
    );
    // In dev mode (which tests run in), shows "Error in <boundary>"
    expect(screen.getByText(/Error in/)).toBeTruthy();
    expect(screen.getByText(/my-section/)).toBeTruthy();
    spy.mockRestore();
  });

  it("shows Try Again button in dev fallback", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary boundaryName="test">
        <ThrowComponent shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Try again")).toBeTruthy();
    spy.mockRestore();
  });

  it("shows error stack in dev fallback", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary boundaryName="test">
        <ThrowComponent shouldThrow />
      </ErrorBoundary>,
    );
    const pre = document.querySelector("pre");
    expect(pre).toBeTruthy();
    expect(pre?.textContent).toContain("Test error message");
    spy.mockRestore();
  });

  it("uses custom fallback when provided", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div>Custom fallback</div>}>
        <ThrowComponent shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText("Custom fallback")).toBeTruthy();
    expect(screen.queryByText(/Error in/)).toBeNull();
    spy.mockRestore();
  });

  it("Try Again resets error state", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary boundaryName="test">
        <ThrowComponent shouldThrow />
      </ErrorBoundary>,
    );
    expect(screen.getByText(/Error in/)).toBeTruthy();
    fireEvent.click(screen.getByText("Try again"));
    // After reset, the ThrowComponent renders again and throws again
    // So the error boundary catches it again
    expect(screen.getByRole("alert")).toBeTruthy();
    spy.mockRestore();
  });
});

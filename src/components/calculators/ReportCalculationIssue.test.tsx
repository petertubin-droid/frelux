import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ReportCalculationIssue from "@/components/calculators/ReportCalculationIssue";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ error: null })),
    })),
  },
}));

describe("ReportCalculationIssue", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders report button", () => {
    render(<ReportCalculationIssue calculatorType="paint" />);
    expect(screen.getByText(/Report incorrect calculation/i)).toBeTruthy();
  });

  it("is collapsed by default", () => {
    render(<ReportCalculationIssue calculatorType="paint" />);
    expect(screen.queryByRole("form")).toBeNull();
  });

  it("expands form on click", () => {
    render(<ReportCalculationIssue calculatorType="paint" />);
    fireEvent.click(screen.getByText(/Report incorrect calculation/i));
    expect(
      screen.getByPlaceholderText(/Describe what you expected/i),
    ).toBeTruthy();
  });

  it("submit button is disabled when description is empty", () => {
    render(<ReportCalculationIssue calculatorType="paint" />);
    fireEvent.click(screen.getByText(/Report incorrect calculation/i));
    const submitBtn = screen.getByText(/Submit Report/i);
    expect(submitBtn).toBeTruthy();
  });

  it("shows success message after submission", async () => {
    render(<ReportCalculationIssue calculatorType="paint" />);
    fireEvent.click(screen.getByText(/Report incorrect calculation/i));
    fireEvent.change(
      screen.getByPlaceholderText(/Describe what you expected/i),
      {
        target: { value: "The result seems off by 2x" },
      },
    );
    fireEvent.click(screen.getByText(/Submit Report/i));
    await waitFor(() => {
      expect(screen.getByText(/Thank you for/i)).toBeTruthy();
    });
  });
});

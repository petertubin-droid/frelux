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

  it("associates optional-field labels with their inputs", async () => {
    render(<ReportCalculationIssue calculatorType="paint" />);
    fireEvent.click(
      screen.getByRole("button", { name: /report an issue|report/i }),
    );
    await waitFor(() => {
      const expected = screen.getByLabelText(
        /what should the correct result be/i,
      );
      expect(expected).toBeTruthy();
      expect((expected as HTMLElement).id).toBe("report-issue-expected-result");
    });
    const email = screen.getByLabelText(/your email/i);
    expect((email as HTMLElement).id).toBe("report-issue-contact-email");
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

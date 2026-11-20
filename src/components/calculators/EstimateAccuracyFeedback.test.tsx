import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import EstimateAccuracyFeedback from "@/components/calculators/EstimateAccuracyFeedback";

const insert = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn(() => ({ insert })) },
}));

describe("EstimateAccuracyFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insert.mockResolvedValue({ error: null });
  });

  it("records one-tap positive feedback with the tool identifier", async () => {
    render(<EstimateAccuracyFeedback toolId="concrete-takeoff" />);
    fireEvent.click(screen.getByRole("button", { name: /about right/i }));
    await waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
    expect(insert.mock.calls[0][0]).toMatchObject({
      kind: "feedback",
      category: "estimate_accuracy:concrete-takeoff",
    });
    expect(screen.getByRole("status")).toHaveTextContent(/thanks/i);
  });

  it("allows optional variance notes", async () => {
    render(<EstimateAccuracyFeedback toolId="borehole" />);
    fireEvent.click(screen.getByRole("button", { name: /too high/i }));
    fireEvent.change(screen.getByLabelText(/what differed/i), {
      target: { value: "Actual depth was greater" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send feedback/i }));
    await waitFor(() => expect(insert).toHaveBeenCalledTimes(1));
    const message = JSON.parse(insert.mock.calls[0][0].message);
    expect(message.rating).toBe("too_high");
    expect(message.comment).toBe("Actual depth was greater");
  });

  it("does not claim submission succeeded when persistence fails", async () => {
    insert.mockResolvedValue({ error: new Error("offline") });
    render(<EstimateAccuracyFeedback toolId="roofing" />);
    fireEvent.click(screen.getByRole("button", { name: /about right/i }));
    await waitFor(() =>
      expect(screen.getByRole("alert")).toHaveTextContent(/try again/i),
    );
    expect(screen.queryByRole("status")).toBeNull();
  });
});

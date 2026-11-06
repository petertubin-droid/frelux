import { afterEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useCalculatorFeedback } from "./useCalculatorFeedback";
import MissingFieldsNotice from "@/components/ui/MissingFieldsNotice";

function Probe({ onCalculate }: { onCalculate: () => void }) {
  const { fieldsRef, resultsRef, missing, handleCalculate } =
    useCalculatorFeedback();
  return (
    <div>
      <div ref={fieldsRef}>
        <label htmlFor="length">
          <span>Plot length</span>
          <input id="length" aria-required="true" />
        </label>
        <label htmlFor="width">
          <span>Plot width</span>
          <input id="width" aria-required="true" defaultValue="15" />
        </label>
      </div>
      <button type="button" onClick={() => handleCalculate(onCalculate)}>
        Calculate
      </button>
      <MissingFieldsNotice fields={missing} />
      <section ref={resultsRef}>
        <h2>Results</h2>
      </section>
    </div>
  );
}

describe("useCalculatorFeedback", () => {
  afterEach(() => vi.restoreAllMocks());

  it("names the empty field and does not calculate", () => {
    const onCalculate = vi.fn();
    render(<Probe onCalculate={onCalculate} />);
    fireEvent.click(screen.getByRole("button", { name: "Calculate" }));
    expect(onCalculate).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toContain("Plot length");
    expect(screen.getByRole("alert").textContent).not.toContain("Plot width");
  });

  it("calculates and moves to the start of the result once complete", async () => {
    const onCalculate = vi.fn();
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    render(<Probe onCalculate={onCalculate} />);

    fireEvent.change(screen.getByLabelText("Plot length"), {
      target: { value: "30" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Calculate" }));

    expect(onCalculate).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(scrollTo).toHaveBeenCalled());
    expect(screen.queryByRole("alert")).toBeNull();
  });
});

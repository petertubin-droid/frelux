import { afterEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const useMarketMock = vi.fn(() => ({
  marketCode: "NG",
  market: { currencySymbol: "₦", currencyCode: "NGN" },
}));

vi.mock("@/lib/international/market-context", () => ({
  useMarket: () => useMarketMock(),
  useSeoOfferCurrency: () => "NGN",
}));
vi.mock("@/lib/use-engine-access", () => ({
  useEngineAccess: () => ({
    limited: false,
    visibleLines: 99,
    canExport: true,
    hiddenLines: () => 0,
  }),
}));
vi.mock("@/lib/international/currency-context", () => ({
  useDisplayCurrency: () => ({ symbol: "₦" }),
}));
vi.mock("@/lib/seo", () => ({
  useSeo: () => undefined,
  useBreadcrumbJsonLd: () => undefined,
}));
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

import { SpecialtyCalculatorShell } from "./SpecialtyCalculatorShell";
import { NumberField } from "./SpecialtyFields";

/** The shell reads the fields from the page, so they have to hold state. */
function HarnessInputs() {
  const [span, setSpan] = useState("");
  const [rate, setRate] = useState("");
  return (
    <>
      <NumberField
        label="Span length"
        unit="m"
        value={span}
        onChange={setSpan}
        required
      />
      <NumberField label="Rate" value={rate} onChange={setRate} />
    </>
  );
}

function renderShell(onRun = vi.fn()) {
  render(
    <MemoryRouter>
      <SpecialtyCalculatorShell
        calculatorType="test_takeoff"
        title="Test takeoff"
        subtitle="A takeoff for the shell tests"
        seoTitle="Test takeoff"
        seoDescription="Test takeoff"
        breadcrumbName="Test takeoff"
        routePath="/test-takeoff"
        limitations={["Nothing outside the tests."]}
        inputs={<HarnessInputs />}
        result={null}
        onRun={onRun}
        priceOverrides={{}}
        onPriceOverride={() => undefined}
        crossLinks={[]}
        quoteTitle="Test takeoff"
        quoteFooter="Test"
      />
    </MemoryRouter>,
  );
  return onRun;
}

describe("SpecialtyCalculatorShell feedback", () => {
  afterEach(() => vi.restoreAllMocks());

  it("puts the measurement tip above the inputs", () => {
    renderShell();
    const tip = screen.getByTestId("measurement-tip");
    expect(tip.textContent).toContain("Set the measurement type and units");
  });

  it("names the empty required field and does not run the takeoff", () => {
    const onRun = renderShell();
    fireEvent.click(
      screen.getByRole("button", { name: /calculate materials/i }),
    );

    expect(onRun).not.toHaveBeenCalled();
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Span length");
    // The unpriced optional field must not be reported.
    expect(alert.textContent).not.toMatch(/Rate/);
  });

  it("runs the takeoff and moves to the first line of the result", async () => {
    const scrollTo = vi.fn();
    vi.stubGlobal("scrollTo", scrollTo);
    const onRun = renderShell();

    fireEvent.change(screen.getByLabelText(/Span length/), {
      target: { value: "6" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /calculate materials/i }),
    );

    expect(onRun).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(scrollTo).toHaveBeenCalled());
    expect(screen.queryByTestId("missing-fields-notice")).toBeNull();
  });
});

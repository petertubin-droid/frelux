import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MaterialPriceField } from "@/components/pricing/MaterialPriceField";
import { FRELUX_PRICE_NOTICE } from "@/lib/pricing/material-price-source";

const baseProps = {
  label: "Cement",
  unitLabel: "per bag",
  currencySymbol: "₦",
  onSourceChange: vi.fn(),
  onCustomChange: vi.fn(),
};

describe("MaterialPriceField", () => {
  it("shows the FRELUX price as indicative and carries the notice", () => {
    render(
      <MaterialPriceField
        {...baseProps}
        source="frelux"
        customValue={null}
        freluxValue={12500}
      />,
    );
    expect(screen.getByText(/12,500/)).toBeInTheDocument();
    expect(screen.getByText("Indicative")).toBeInTheDocument();
    expect(screen.getByText(FRELUX_PRICE_NOTICE)).toBeInTheDocument();
  });

  it("says no price is available rather than showing a zero", () => {
    render(
      <MaterialPriceField
        {...baseProps}
        source="frelux"
        customValue={null}
        freluxValue={null}
      />,
    );
    expect(screen.getByText(/No price available/i)).toBeInTheDocument();
    expect(screen.queryByText("₦0")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /enter my own price/i }),
    ).toBeInTheDocument();
  });

  it("lets the user type their own price", async () => {
    const onCustomChange = vi.fn();
    render(
      <MaterialPriceField
        {...baseProps}
        onCustomChange={onCustomChange}
        source="custom"
        customValue={null}
        freluxValue={12500}
      />,
    );
    const input = screen.getByPlaceholderText(/price per bag/i);
    await userEvent.type(input, "18");
    expect(onCustomChange).toHaveBeenCalled();
  });

  it("offers both sources as a radio group", () => {
    render(
      <MaterialPriceField
        {...baseProps}
        source="frelux"
        customValue={null}
        freluxValue={900}
      />,
    );
    const group = screen.getByRole("radiogroup", {
      name: /price source for cement/i,
    });
    expect(group).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(2);
  });
});

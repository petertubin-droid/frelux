import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ExpenseCrowdsourceCard } from "./ExpenseCrowdsourceCard";

describe("ExpenseCrowdsourceCard", () => {
  it("renders crowdsourcing toggle and benchmark metadata", async () => {
    const handleToggle = vi.fn();
    render(
      <ExpenseCrowdsourceCard
        marketCode="KE"
        city="Nairobi"
        materialName="Portland Cement 50kg"
        enteredPrice={950}
        currency="KES"
        optIn={true}
        onToggleOptIn={handleToggle}
      />,
    );

    expect(screen.getByText("Closed-Loop Price Sharing")).toBeDefined();
    expect(screen.getByText("Opted In")).toBeDefined();

    const toggle = screen.getByRole("switch");
    fireEvent.click(toggle);
    expect(handleToggle).toHaveBeenCalledWith(false);
  });
});

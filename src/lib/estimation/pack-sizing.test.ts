import { describe, it, expect } from "vitest";
import {
  calculateLeftover,
  roundPackQuantity,
  roundPackWithMin,
} from "./pack-sizing";

describe("estimation/pack-sizing", () => {
  it("calculateLeftover returns difference when practical > theoretical", () => {
    expect(calculateLeftover(15, 20)).toBe(5);
  });

  it("calculateLeftover returns 0 when theoretical >= practical", () => {
    expect(calculateLeftover(20, 20)).toBe(0);
    expect(calculateLeftover(25, 20)).toBe(0);
  });

  it("calculateLeftover handles NaN", () => {
    expect(calculateLeftover(NaN, 20)).toBe(20);
    expect(calculateLeftover(15, NaN)).toBe(0);
  });

  it("roundPackQuantity with ceil rounds up", () => {
    const result = roundPackQuantity(15, 4, "ceil");
    expect(result.theoretical_quantity).toBe(15);
    expect(result.practical_purchase_quantity).toBe(16);
    expect(result.pack_count).toBe(4);
    expect(result.leftover_quantity).toBe(1);
  });

  it("roundPackQuantity with floor rounds down", () => {
    const result = roundPackQuantity(15, 4, "floor");
    expect(result.practical_purchase_quantity).toBe(12);
    expect(result.pack_count).toBe(3);
  });

  it("roundPackQuantity with round rounds to nearest", () => {
    const result = roundPackQuantity(14, 4, "round");
    expect(result.pack_count).toBe(4);
    expect(result.practical_purchase_quantity).toBe(16);

    const result2 = roundPackQuantity(10, 4, "round");
    expect(result2.pack_count).toBe(3);
    expect(result2.practical_purchase_quantity).toBe(12);
  });

  it("roundPackQuantity with none keeps theoretical", () => {
    const result = roundPackQuantity(15, 4, "none");
    expect(result.practical_purchase_quantity).toBe(15);
    expect(result.leftover_quantity).toBe(0);
  });

  it("roundPackQuantity maps full_pack to ceil", () => {
    const result = roundPackQuantity(15, 4, "full_pack");
    expect(result.practical_purchase_quantity).toBe(16);
  });

  it("roundPackQuantity maps partial_allowed to none", () => {
    const result = roundPackQuantity(15, 4, "partial_allowed");
    expect(result.practical_purchase_quantity).toBe(15);
  });

  it("roundPackQuantity handles zero inputs", () => {
    const result = roundPackQuantity(0, 4, "ceil");
    expect(result.theoretical_quantity).toBe(0);
    expect(result.pack_count).toBe(0);
  });

  it("roundPackQuantity default rule is ceil", () => {
    const result = roundPackQuantity(15, 4);
    expect(result.practical_purchase_quantity).toBe(16);
  });

  it("roundPackWithMin enforces minimum quantity", () => {
    const result = roundPackWithMin(5, 4, 20, "ceil");
    expect(result.practical_purchase_quantity).toBeGreaterThanOrEqual(20);
  });

  it("roundPackWithMin returns base result when already above min", () => {
    const result = roundPackWithMin(20, 4, 10, "ceil");
    expect(result.practical_purchase_quantity).toBe(20);
  });
});

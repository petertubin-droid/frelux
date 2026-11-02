import { describe, it, expect, beforeEach } from "vitest";
import {
  saveForComparison,
  getComparisonEntries,
  clearComparison,
  removeFromComparison,
} from "@/components/ui/CompareResults";

beforeEach(() => {
  localStorage.clear();
});

describe("saveForComparison", () => {
  it("saves a new entry", () => {
    saveForComparison("1", "Test A", { cost: 100 });
    const entries = getComparisonEntries();
    expect(entries.length).toBe(1);
    expect(entries[0].label).toBe("Test A");
    expect(entries[0].data.cost).toBe(100);
  });

  it("replaces entry with same id", () => {
    saveForComparison("1", "Test A", { cost: 100 });
    saveForComparison("1", "Test A updated", { cost: 200 });
    const entries = getComparisonEntries();
    expect(entries.length).toBe(1);
    expect(entries[0].label).toBe("Test A updated");
  });

  it("keeps max 4 entries", () => {
    for (let i = 0; i < 6; i++) {
      saveForComparison(`id-${i}`, `Entry ${i}`, { cost: i });
    }
    const entries = getComparisonEntries();
    expect(entries.length).toBe(4);
    expect(entries[0].label).toBe("Entry 5");
  });

  it("prepends new entries", () => {
    saveForComparison("1", "First", { cost: 1 });
    saveForComparison("2", "Second", { cost: 2 });
    const entries = getComparisonEntries();
    expect(entries[0].label).toBe("Second");
    expect(entries[1].label).toBe("First");
  });
});

describe("getComparisonEntries", () => {
  it("returns empty array when nothing saved", () => {
    expect(getComparisonEntries()).toEqual([]);
  });
});

describe("removeFromComparison", () => {
  it("removes entry by id", () => {
    saveForComparison("1", "A", { cost: 1 });
    saveForComparison("2", "B", { cost: 2 });
    removeFromComparison("1");
    const entries = getComparisonEntries();
    expect(entries.length).toBe(1);
    expect(entries[0].id).toBe("2");
  });

  it("does nothing when id not found", () => {
    saveForComparison("1", "A", { cost: 1 });
    removeFromComparison("nonexistent");
    expect(getComparisonEntries().length).toBe(1);
  });
});

describe("clearComparison", () => {
  it("clears all entries", () => {
    saveForComparison("1", "A", { cost: 1 });
    clearComparison();
    expect(getComparisonEntries()).toEqual([]);
  });
});

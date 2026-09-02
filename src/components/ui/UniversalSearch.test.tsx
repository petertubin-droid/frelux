import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import UniversalSearch, { type SearchItem } from "@/components/ui/UniversalSearch";

const items: SearchItem[] = [
  { id: "1", label: "Paint Calculator", sublabel: "Calculate paint", href: "/paint" },
  { id: "2", label: "Tile Calculator", sublabel: "Calculate tiles", href: "/tile" },
  { id: "3", label: "Color Red", sublabel: "Warm red", hex: "#FF0000", href: "/colors/red" },
];

function renderSearch(overrides?: Record<string, unknown>) {
  const onSelect = vi.fn();
  const onQueryChange = vi.fn();
  return {
    onSelect,
    onQueryChange,
    ...render(
      <UniversalSearch
        items={items}
        onSelect={onSelect}
        onQueryChange={onQueryChange}
        {...overrides}
      />,
    ),
  };
}

describe("UniversalSearch", () => {
  it("renders input with default placeholder", () => {
    renderSearch();
    expect(screen.getByPlaceholderText("Search...")).toBeTruthy();
  });

  it("renders input with custom placeholder", () => {
    renderSearch({ placeholder: "Search tools..." });
    expect(screen.getByPlaceholderText("Search tools...")).toBeTruthy();
  });

  it("shows filtered results when typing", () => {
    renderSearch();
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "paint" } });
    expect(screen.getByText("Paint Calculator")).toBeTruthy();
    expect(screen.queryByText("Tile Calculator")).toBeNull();
  });

  it("filters by sublabel too", () => {
    renderSearch();
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "tiles" } });
    expect(screen.getByText("Tile Calculator")).toBeTruthy();
  });

  it("calls onQueryChange when typing", () => {
    const { onQueryChange } = renderSearch();
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "red" } });
    expect(onQueryChange).toHaveBeenCalledWith("red");
  });

  it("calls onSelect when clicking a result", () => {
    const { onSelect } = renderSearch();
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "paint" } });
    fireEvent.click(screen.getByText("Paint Calculator"));
    expect(onSelect).toHaveBeenCalledWith(items[0]);
  });

  it("shows clear button when query is entered", () => {
    renderSearch();
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "test" } });
    expect(screen.getByLabelText("Clear search")).toBeTruthy();
  });

  it("clears query when clear button is clicked", () => {
    renderSearch();
    const input = screen.getByPlaceholderText("Search...") as HTMLInputElement;
    fireEvent.change(input, { target: { value: "test" } });
    fireEvent.click(screen.getByLabelText("Clear search"));
    expect(input.value).toBe("");
  });

  it("limits results to 8", () => {
    const manyItems: SearchItem[] = Array.from({ length: 20 }, (_, i) => ({
      id: String(i),
      label: `Item ${i}`,
    }));
    const onSelect = vi.fn();
    render(
      <UniversalSearch items={manyItems} onSelect={onSelect} />,
    );
    const input = screen.getByPlaceholderText("Search...");
    fireEvent.change(input, { target: { value: "Item" } });
    const results = screen.getAllByText(/Item \d/);
    expect(results.length).toBe(8);
  });
});

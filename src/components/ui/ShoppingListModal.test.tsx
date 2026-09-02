import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ShoppingListModal } from "@/components/ui/ShoppingListModal";
import type { ShoppingListItem } from "@/lib/shopping-list";

vi.mock("@/lib/share", () => ({
  shareTextOnWhatsApp: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});

const items: ShoppingListItem[] = [
  { name: "Premium paint (4 L)", quantity: "3 containers", checked: false },
  { name: "Primer", quantity: "1 container", checked: false },
  { name: "Sandpaper", quantity: "5 sheets", checked: false },
];

describe("ShoppingListModal", () => {
  it("renders title", () => {
    render(<ShoppingListModal items={items} title="Paint Shopping List" onClose={vi.fn()} />);
    expect(screen.getByText("Paint Shopping List")).toBeTruthy();
  });

  it("renders item text as quantity, name", () => {
    render(<ShoppingListModal items={items} title="Test" onClose={vi.fn()} />);
    expect(screen.getByText(/3 containers, Premium paint/)).toBeTruthy();
    expect(screen.getByText(/1 container, Primer/)).toBeTruthy();
  });

  it("calls onClose when X button clicked", () => {
    const onClose = vi.fn();
    const { container } = render(<ShoppingListModal items={items} title="Test" onClose={onClose} />);
    const closeBtn = container.querySelector('button[type="button"]');
    fireEvent.click(closeBtn!);
    expect(onClose).toHaveBeenCalled();
  });

  it("renders share button", () => {
    render(<ShoppingListModal items={items} title="Test" onClose={vi.fn()} />);
    expect(screen.getByText(/share/i)).toBeTruthy();
  });
});

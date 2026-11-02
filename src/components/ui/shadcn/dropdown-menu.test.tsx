import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/shadcn/dropdown-menu";

describe("shadcn/dropdown-menu", () => {
  it("exports DropdownMenu components", () => {
    expect(DropdownMenu).toBeDefined();
    expect(DropdownMenuTrigger).toBeDefined();
    expect(DropdownMenuContent).toBeDefined();
    expect(DropdownMenuItem).toBeDefined();
    expect(DropdownMenuLabel).toBeDefined();
    expect(DropdownMenuSeparator).toBeDefined();
  });

  it("renders trigger content", () => {
    render(
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button>Menu</button>
        </DropdownMenuTrigger>
      </DropdownMenu>,
    );
    expect(screen.getByText("Menu")).toBeTruthy();
  });
});

import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/shadcn/tooltip";

describe("shadcn/tooltip", () => {
  it("exports Tooltip components", () => {
    expect(Tooltip).toBeDefined();
    expect(TooltipTrigger).toBeDefined();
    expect(TooltipContent).toBeDefined();
    expect(TooltipProvider).toBeDefined();
  });

  it("renders trigger content", () => {
    render(
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <button>Hover me</button>
          </TooltipTrigger>
        </Tooltip>
      </TooltipProvider>,
    );
    expect(screen.getByText("Hover me")).toBeTruthy();
  });
});

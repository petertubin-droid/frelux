import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { Dialog, DialogTrigger, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/shadcn/dialog";

describe("shadcn/dialog", () => {
  it("exports Dialog components", () => {
    expect(Dialog).toBeDefined();
    expect(DialogTrigger).toBeDefined();
    expect(DialogContent).toBeDefined();
    expect(DialogTitle).toBeDefined();
    expect(DialogDescription).toBeDefined();
    expect(DialogClose).toBeDefined();
  });

  it("renders trigger content", () => {
    render(
      <Dialog>
        <DialogTrigger asChild>
          <button>Open Dialog</button>
        </DialogTrigger>
      </Dialog>,
    );
    expect(screen.getByText("Open Dialog")).toBeTruthy();
  });
});

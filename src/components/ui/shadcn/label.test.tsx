import type { ComponentType } from "react";
import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";

async function renderComp(props: Record<string, unknown> = {}) {
  const mod =
    (await import("@/components/ui/shadcn/label")) as unknown as Record<
      string,
      ComponentType<Record<string, unknown>>
    >;
  const Comp = mod.default ?? mod[Object.keys(mod)[0]];
  return render(<Comp {...props} />);
}

describe("shadcn/label", () => {
  it("renders without crashing", async () => {
    const { container } = await renderComp();
    expect(container.innerHTML).not.toBe("");
  });
});

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ConversionDock from "@/components/convert/ConversionDock";

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ConversionDock />
    </MemoryRouter>,
  );

const REM = 16;
/** Chat bubble footprint measured from the viewport bottom, in px. */
const chatTopEdge = (bottom: number, height: number) =>
  bottom * REM + height * REM;

const readPx = (token: string | undefined): number | null => {
  if (!token) return null;
  const match = token.match(/^(\d+(?:\.\d+)?)rem$/);
  return match ? Number(match[1]) * REM : null;
};

describe("ConversionDock placement", () => {
  it("clears the support chat bubble on mobile", () => {
    const { container } = renderAt("/paint-calculator");
    const dock = container.firstElementChild as HTMLElement;
    const classes = dock.className.split(/\s+/);
    const mobile = classes.find((c) => c.startsWith("bottom-[calc("));
    expect(mobile).toBeTruthy();
    const offset = Number(mobile!.match(/calc\((\d+(?:\.\d+)?)rem/)![1]) * REM;
    // Chat bubble: 5rem from the bottom, 3.5rem tall.
    expect(offset).toBeGreaterThanOrEqual(chatTopEdge(5, 3.5));
  });

  it("clears the chat bubble on desktop too", () => {
    const { container } = renderAt("/paint-calculator");
    const dock = container.firstElementChild as HTMLElement;
    const desktop = dock.className
      .split(/\s+/)
      .find((c) => /^sm:bottom-(?!0)/.test(c))
      ?.replace("sm:bottom-", "");
    const offset = readPx(` ${desktop}rem`.trim());
    expect(offset).not.toBeNull();
    // Chat bubble: 1rem from the bottom, 3.5rem tall.
    expect(offset!).toBeGreaterThanOrEqual(chatTopEdge(1, 3.5));
  });

  it("keeps the button reachable rather than behind the widget", () => {
    const { getByRole } = renderAt("/paint-calculator");
    expect(getByRole("button", { name: /convert/i })).toBeTruthy();
  });
});

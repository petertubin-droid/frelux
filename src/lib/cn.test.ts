import { describe, it, expect } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("merges simple class strings", () => {
    expect(cn("px-2", "py-1")).toBe("px-2 py-1");
  });

  it("handles conditional classes", () => {
    const falsy: string | false = false;
    expect(cn("base", falsy && "hidden", "visible")).toBe("base visible");
  });

  it("resolves Tailwind conflicts (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
  });

  it("handles empty and falsy inputs", () => {
    expect(cn("", null, undefined, false, "real")).toBe("real");
  });

  it("handles objects", () => {
    expect(cn({ active: true, inactive: false })).toBe("active");
  });

  it("handles arrays", () => {
    expect(cn(["px-2", "py-1"])).toBe("px-2 py-1");
  });
});

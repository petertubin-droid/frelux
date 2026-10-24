import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import SafeMarkdown from "./SafeMarkdown";

describe("SafeMarkdown", () => {
  it("renders common editorial markdown without interpreting raw HTML", () => {
    const { container } = render(<SafeMarkdown content={'## Surface preparation\n\nUse **clean** tools and *dry* materials.\n\n- Remove loose material\n- [Read the standard](https://example.org/spec)\n\n<script>alert(1)</script>'} />);
    expect(screen.getByRole("heading", { name: "Surface preparation" })).toBeTruthy();
    expect(screen.getByText("clean").tagName).toBe("STRONG");
    expect(screen.getByRole("link", { name: "Read the standard" }).getAttribute("href")).toBe("https://example.org/spec");
    expect(container.querySelector("script")).toBeNull();
  });
  it("does not turn javascript URLs into links", () => {
    render(<SafeMarkdown content="[unsafe](javascript:alert(1))" />);
    expect(screen.queryByRole("link")).toBeNull();
  });
});

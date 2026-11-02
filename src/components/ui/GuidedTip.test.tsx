import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GuidedTip } from "@/components/ui/GuidedTip";

describe("GuidedTip", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("renders tip when not dismissed", () => {
    render(
      <GuidedTip
        tip={{ id: "tip1", title: "Pro Tip", content: "Use shortcuts!" }}
      />,
    );
    expect(screen.getByText("Pro Tip")).toBeTruthy();
    expect(screen.getByText("Use shortcuts!")).toBeTruthy();
  });

  it("returns null when tip is dismissed", () => {
    localStorage.setItem("frelux_dismissed_tips", JSON.stringify(["tip1"]));
    const { container } = render(
      <GuidedTip
        tip={{ id: "tip1", title: "Pro Tip", content: "Use shortcuts!" }}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("hides on dismiss click", () => {
    render(
      <GuidedTip
        tip={{ id: "tip1", title: "Pro Tip", content: "Use shortcuts!" }}
      />,
    );
    fireEvent.click(screen.getByLabelText("Dismiss tip"));
    expect(screen.queryByText("Pro Tip")).toBeNull();
  });

  it("persists dismissal to localStorage", () => {
    render(
      <GuidedTip
        tip={{ id: "tip1", title: "Pro Tip", content: "Use shortcuts!" }}
      />,
    );
    fireEvent.click(screen.getByLabelText("Dismiss tip"));
    const stored = JSON.parse(
      localStorage.getItem("frelux_dismissed_tips") || "[]",
    );
    expect(stored).toContain("tip1");
  });

  it("renders different tips independently", () => {
    localStorage.setItem("frelux_dismissed_tips", JSON.stringify(["tip1"]));
    const { container } = render(
      <GuidedTip
        tip={{ id: "tip2", title: "New Tip", content: "Another tip" }}
      />,
    );
    expect(screen.getByText("New Tip")).toBeTruthy();
    expect(container.firstChild).not.toBeNull();
  });

  it("applies custom className", () => {
    const { container } = render(
      <GuidedTip
        tip={{ id: "tip1", title: "T", content: "C" }}
        className="my-tip"
      />,
    );
    expect(container.firstChild).toBeTruthy();
  });
});

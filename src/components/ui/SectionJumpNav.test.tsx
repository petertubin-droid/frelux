import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import SectionJumpNav from "./SectionJumpNav";

const scrollIntoView = vi.fn();

beforeEach(() => {
  scrollIntoView.mockReset();
  Element.prototype.scrollIntoView = scrollIntoView;
  document.body.innerHTML = "";
});

function withTargets(ids: string[]) {
  for (const id of ids) {
    const el = document.createElement("div");
    el.id = id;
    el.textContent = id;
    document.body.appendChild(el);
  }
}

const sections = [
  { id: "start", label: "Start" },
  { id: "results", label: "Results" },
  { id: "faq", label: "Questions" },
];

describe("SectionJumpNav", () => {
  it("renders one control per section and marks the first as current", () => {
    withTargets(["start", "results", "faq"]);
    render(<SectionJumpNav sections={sections} />);
    expect(screen.getByLabelText("On this page")).toBeTruthy();
    const items = screen.getAllByRole("button");
    expect(items).toHaveLength(3);
    expect(items[0].getAttribute("aria-current")).toBe("true");
    expect(items[1].getAttribute("aria-current")).toBeNull();
  });

  it("scrolls to the section a reader picks and moves the current marker", () => {
    withTargets(["start", "results", "faq"]);
    render(<SectionJumpNav sections={sections} />);
    fireEvent.click(screen.getByRole("button", { name: "Questions" }));
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    expect(scrollIntoView.mock.calls[0][0]).toMatchObject({ block: "start" });
    expect(
      screen
        .getByRole("button", { name: "Questions" })
        .getAttribute("aria-current"),
    ).toBe("true");
  });

  it("uses instant scrolling when the reader prefers reduced motion", () => {
    withTargets(["start", "results"]);
    window.matchMedia = vi.fn().mockReturnValue({ matches: true });
    render(<SectionJumpNav sections={sections.slice(0, 2)} />);
    fireEvent.click(screen.getByRole("button", { name: "Results" }));
    expect(scrollIntoView.mock.calls[0][0]).toMatchObject({ behavior: "auto" });
  });

  it("stays quiet when a target is not on the page", () => {
    render(<SectionJumpNav sections={sections} />);
    fireEvent.click(screen.getByRole("button", { name: "Results" }));
    expect(scrollIntoView).not.toHaveBeenCalled();
  });

  it("renders nothing without sections", () => {
    const { container } = render(<SectionJumpNav sections={[]} />);
    expect(container.querySelector("nav")).toBeNull();
  });
});

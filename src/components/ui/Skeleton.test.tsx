import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonGrid,
  SkeletonStat,
  SkeletonColorCard,
} from "@/components/ui/Skeleton";

describe("Skeleton", () => {
  it("renders with default rect variant", () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector("div")!;
    expect(el.className).toContain("rounded-lg");
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders text variant with h-4 class", () => {
    const { container } = render(<Skeleton variant="text" />);
    const el = container.querySelector("div")!;
    expect(el.className).toContain("h-4");
    expect(el.className).toContain("rounded");
  });

  it("renders circle variant", () => {
    const { container } = render(<Skeleton variant="circle" />);
    const el = container.querySelector("div")!;
    expect(el.className).toContain("rounded-full");
  });

  it("renders card variant", () => {
    const { container } = render(<Skeleton variant="card" />);
    const el = container.querySelector("div")!;
    expect(el.className).toContain("rounded-xl");
  });

  it("applies custom width and height", () => {
    const { container } = render(<Skeleton width="100px" height="50px" />);
    const el = container.querySelector("div")!;
    expect(el.style.width).toBe("100px");
    expect(el.style.height).toBe("50px");
  });

  it("applies custom className", () => {
    const { container } = render(<Skeleton className="custom-skel" />);
    const el = container.querySelector("div")!;
    expect(el.className).toContain("custom-skel");
  });

  it("has aria-hidden true for accessibility", () => {
    const { container } = render(<Skeleton />);
    const el = container.querySelector("div")!;
    expect(el.getAttribute("aria-hidden")).toBe("true");
  });
});

describe("SkeletonText", () => {
  it("renders the specified number of lines", () => {
    const { container } = render(<SkeletonText lines={5} />);
    const skeletons = container.querySelectorAll(".animate-skeleton-pulse");
    expect(skeletons.length).toBe(5);
  });

  it("defaults to 3 lines", () => {
    const { container } = render(<SkeletonText />);
    const skeletons = container.querySelectorAll(".animate-skeleton-pulse");
    expect(skeletons.length).toBe(3);
  });

  it("last line is shorter (w-2/3)", () => {
    const { container } = render(<SkeletonText lines={3} />);
    const skeletons = container.querySelectorAll(".animate-skeleton-pulse");
    expect(skeletons[2].className).toContain("w-2/3");
  });
});

describe("SkeletonCard", () => {
  it("renders a card with multiple skeleton elements", () => {
    const { container } = render(<SkeletonCard />);
    const skeletons = container.querySelectorAll(".animate-skeleton-pulse");
    expect(skeletons.length).toBeGreaterThan(3);
  });
});

describe("SkeletonGrid", () => {
  it("renders the specified count of cards", () => {
    const { container } = render(<SkeletonGrid count={4} />);
    const cards = container.querySelectorAll(".card");
    expect(cards.length).toBe(4);
  });

  it("defaults to 6 cards", () => {
    const { container } = render(<SkeletonGrid />);
    const cards = container.querySelectorAll(".card");
    expect(cards.length).toBe(6);
  });
});

describe("SkeletonStat", () => {
  it("renders with stat-card class", () => {
    const { container } = render(<SkeletonStat />);
    const stat = container.querySelector(".stat-card");
    expect(stat).toBeTruthy();
  });
});

describe("SkeletonColorCard", () => {
  it("renders with aspect ratio container", () => {
    const { container } = render(<SkeletonColorCard />);
    const aspectEl = container.querySelector(".aspect-\\[4\\/5\\]");
    expect(aspectEl).toBeTruthy();
  });
});

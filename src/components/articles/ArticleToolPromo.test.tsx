import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ArticleToolPromo from "./ArticleToolPromo";
import ArticleQuickAnswers from "./ArticleQuickAnswers";

describe("ArticleToolPromo", () => {
  it("advertises the calculators that belong to the article's category", () => {
    render(
      <MemoryRouter>
        <ArticleToolPromo category="painting-guides" />
      </MemoryRouter>,
    );
    expect(screen.getByText("Put this article into numbers")).toBeTruthy();
    expect(screen.getByText("Paint Calculator")).toBeTruthy();
    expect(screen.getByText("Paint Comparison")).toBeTruthy();
  });

  it("links each card to the tool's own route", () => {
    render(
      <MemoryRouter>
        <ArticleToolPromo category="tile-guides" />
      </MemoryRouter>,
    );
    const link = screen.getByText("Tile Calculator").closest("a");
    expect(link?.getAttribute("href")).toBe("/tile-calculator");
  });

  it("renders nothing for a category with no mapped tool", () => {
    const { container } = render(
      <MemoryRouter>
        <ArticleToolPromo category="unmapped-category" />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders nothing without a category rather than guessing one", () => {
    const { container } = render(
      <MemoryRouter>
        <ArticleToolPromo category={null} />
      </MemoryRouter>,
    );
    expect(container.firstChild).toBeNull();
  });

  it("keeps the copy free of em dashes", () => {
    const { container } = render(
      <MemoryRouter>
        <ArticleToolPromo category="cost-guides" />
      </MemoryRouter>,
    );
    expect(container.textContent ?? "").not.toMatch(/[—–]/);
  });
});

describe("ArticleQuickAnswers", () => {
  const items = Array.from({ length: 5 }, (_, i) => ({
    question: `Question ${i + 1}?`,
    answer: `Answer ${i + 1}.`,
  }));

  it("shows the first three questions only", () => {
    render(<ArticleQuickAnswers items={items} />);
    expect(screen.getByText("Question 1?")).toBeTruthy();
    expect(screen.getByText("Question 3?")).toBeTruthy();
    expect(screen.queryByText("Question 4?")).toBeNull();
  });

  it("points at the full list when there are more questions", () => {
    render(<ArticleQuickAnswers items={items} />);
    expect(screen.getByText(/All 5 questions/)).toBeTruthy();
  });

  it("renders nothing when the article has no questions", () => {
    const { container } = render(<ArticleQuickAnswers items={[]} />);
    expect(container.firstChild).toBeNull();
  });
});

import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ArticleMarkdown } from "@/components/learn/ArticleMarkdown";
import { ArticleTopicList } from "@/components/learn/ArticleTopicList";
import type { DbLearnArticle, DbLearnArticleFaq } from "@/types/database";

const faqs: DbLearnArticleFaq[] = [
  {
    id: "f1",
    question: "How deep should a console be?",
    answer: "Between 350 and 450 mm.",
  },
  {
    id: "f2",
    question: "Which board holds screws best?",
    answer: "MDF needs pilot holes; plywood grips.",
  },
] as DbLearnArticleFaq[];

const article = (over: Partial<DbLearnArticle>) =>
  ({
    id: "a1",
    slug: "console-guide",
    title: "Console guide",
    category_slug: "furniture",
    read_time_minutes: 6,
    published_at: "2026-11-01T00:00:00Z",
    cover_image_url: "https://example.com/cover.jpg",
    ...over,
  }) as DbLearnArticle;

describe("article FAQ inserts", () => {
  it("sets questions into the body after a heading instead of a collapsed panel", () => {
    render(
      <ArticleMarkdown
        content={
          "## Depth\n\nText about depth.\n\n## Fixings\n\nText about fixings."
        }
        faqsByHeading={{ depth: faqs }}
      />,
    );
    const insert = document.querySelector("[data-faq-insert]");
    expect(insert).toBeTruthy();
    expect(insert?.id).toBe("faqs");
    // Answers are visible text, so nothing needs expanding.
    expect(screen.getByText("How deep should a console be?")).toBeTruthy();
    expect(screen.getByText("Between 350 and 450 mm.")).toBeTruthy();
    expect(document.querySelector("[data-faq-insert] details")).toBeNull();
  });

  it("anchors only the first FAQ insert so deep links land once", () => {
    render(
      <ArticleMarkdown
        content={"## Depth\n\nText.\n\n## Fixings\n\nText."}
        faqsByHeading={{ depth: [faqs[0]], fixings: [faqs[1]] }}
      />,
    );
    expect(document.querySelectorAll("[data-faq-insert]").length).toBe(2);
    expect(document.querySelectorAll("#faqs").length).toBe(1);
  });

  it("carries FAQs with no matching heading to the end of the body", () => {
    render(
      <ArticleMarkdown content={"Plain paragraph only."} trailingFaqs={faqs} />,
    );
    expect(document.querySelector("[data-faq-insert]")?.id).toBe("faqs");
    expect(screen.getByText("Which board holds screws best?")).toBeTruthy();
  });
});

describe("article topic list", () => {
  it("lists topics without cover imagery", () => {
    render(
      <MemoryRouter>
        <ArticleTopicList
          label="Related articles"
          items={[
            article({}),
            article({
              id: "a2",
              slug: "board-guide",
              title: "Board guide",
              cover_image_url: null,
            }),
          ]}
        />
      </MemoryRouter>,
    );
    expect(screen.getByLabelText("Related articles")).toBeTruthy();
    expect(document.querySelectorAll("img").length).toBe(0);
    expect(screen.getByText("Console guide")).toBeTruthy();
    expect(screen.getByText("Board guide")).toBeTruthy();
    expect(
      screen.getByText("Console guide").closest("a")?.getAttribute("href"),
    ).toBe("/learn/console-guide/");
  });
});

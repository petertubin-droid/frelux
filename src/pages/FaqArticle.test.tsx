import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import FaqArticle from "@/pages/FaqArticle";
import { getFaqArticle } from "@/config/faq-articles";
import { mergedArticle } from "@/config/faq-longform";
import { getToolFaqGroup } from "@/config/tool-faqs";

const useFaqJsonLd = vi.fn();
vi.mock("@/lib/seo", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/seo")>()),
  useSeo: vi.fn(),
  useBreadcrumbJsonLd: vi.fn(),
  useFaqJsonLd: (...args: unknown[]) => useFaqJsonLd(...args),
}));

function renderArticle(slug: string) {
  return render(
    <MemoryRouter initialEntries={[`/faq/${slug}`]}>
      <Routes>
        <Route path="/faq/:slug" element={<FaqArticle />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("FaqArticle", () => {
  it("renders all five sections for a real group", () => {
    renderArticle("foundation-calculator");
    const group = getToolFaqGroup("foundation-calculator")!;
    const article = mergedArticle(
      "foundation-calculator",
      getFaqArticle("foundation-calculator")!,
    );

    expect(
      screen.getByRole("heading", { level: 1, name: group.name }),
    ).toBeInTheDocument();
    for (const heading of [
      "What it is",
      "What it calculates",
      "Why contractors use it",
      "What it leaves out",
    ]) {
      expect(
        screen.getByRole("heading", { level: 2, name: heading }),
      ).toBeInTheDocument();
    }
    for (const paragraph of article.description.split("\n\n")) {
      expect(screen.getByText(paragraph)).toBeInTheDocument();
    }
    expect(screen.getByText(article.functions[0])).toBeInTheDocument();
    expect(screen.getByText(article.limits[0])).toBeInTheDocument();
    expect(
      screen.getByRole("heading", {
        level: 2,
        name: `${group.name} questions`,
      }),
    ).toBeInTheDocument();
    expect(screen.getByText(group.questions[0].q)).toBeInTheDocument();
  });

  it("emits FAQPage data from the group's own answers", () => {
    useFaqJsonLd.mockClear();
    renderArticle("steel-beam-calculator");
    const group = getToolFaqGroup("steel-beam-calculator")!;
    expect(useFaqJsonLd).toHaveBeenCalledWith(
      group.questions.map((q) => ({ question: q.q, answer: q.a })),
    );
  });

  it("links to the tool and back to the full list", () => {
    renderArticle("paint-calculator");
    expect(
      screen.getByRole("link", { name: /Open the tool/i }),
    ).toHaveAttribute("href", "/paint-calculator");
    expect(
      screen.getByRole("link", { name: /Every question FRELUX answers/i }),
    ).toHaveAttribute("href", "/faq");
  });

  it("handles a slug with no article", () => {
    renderArticle("not-a-tool");
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /does not exist/i,
    );
    expect(
      screen.getByRole("link", { name: /Browse every question/i }),
    ).toHaveAttribute("href", "/faq");
  });
});

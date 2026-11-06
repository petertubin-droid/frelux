import { afterEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ToolFaqs, { FaqItemsWithSchema } from "@/components/seo/ToolFaqs";
import { getToolFaqGroup } from "@/config/tool-faqs";

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (key: string) => key, language: "en" }),
}));

const SLUG = "paint-calculator";

const readFaqSchema = () => {
  const el = document.getElementById("faq-jsonld");
  return el ? JSON.parse(el.textContent ?? "{}") : null;
};

const renderFaqs = (ui: React.ReactNode) =>
  render(<MemoryRouter>{ui}</MemoryRouter>);

afterEach(() => {
  document.getElementById("faq-jsonld")?.remove();
});

describe("ToolFaqs", () => {
  it("renders the registry questions for a known tool", () => {
    const group = getToolFaqGroup(SLUG)!;
    expect(group.questions.length).toBeGreaterThan(0);
    renderFaqs(<ToolFaqs slug={SLUG} />);

    expect(
      screen.getByRole("heading", {
        name: `${group.name}: frequently asked questions`,
      }),
    ).toBeInTheDocument();
    expect(screen.getAllByText(group.questions[0].q).length).toBeGreaterThan(0);
  });

  it("emits FAQPage markup that matches the text on screen word for word", () => {
    const group = getToolFaqGroup(SLUG)!;
    renderFaqs(<ToolFaqs slug={SLUG} />);

    const schema = readFaqSchema();
    expect(schema?.["@type"]).toBe("FAQPage");
    expect(schema?.mainEntity).toHaveLength(group.questions.length);

    // The usual failure is markup that drifts from the visible copy, which
    // Google treats as a mismatch and ignores. Compare against the registry
    // strings the accordion renders, not a hand written copy.
    schema.mainEntity.forEach(
      (
        entry: { name: string; acceptedAnswer: { text: string } },
        i: number,
      ) => {
        expect(entry.name).toBe(group.questions[i].q);
        expect(entry.acceptedAnswer.text).toBe(group.questions[i].a);
        expect(screen.getAllByText(entry.name).length).toBeGreaterThan(0);
      },
    );
  });

  it("takes a custom heading, and still matches the schema", () => {
    const group = getToolFaqGroup(SLUG)!;
    renderFaqs(<ToolFaqs slug={SLUG} title="Paint questions" />);
    expect(
      screen.getByRole("heading", { name: "Paint questions" }),
    ).toBeInTheDocument();
    expect(readFaqSchema()?.mainEntity).toHaveLength(group.questions.length);
  });

  it("stays silent for a slug the registry does not know", () => {
    const { container } = renderFaqs(<ToolFaqs slug="not-a-real-tool" />);
    expect(container.textContent).toBe("");
    // No empty FAQPage either: schema with no questions is a validation error.
    expect(readFaqSchema()).toBeNull();
  });

  it("drops the markup when the questions are gone", () => {
    const { unmount } = renderFaqs(<ToolFaqs slug={SLUG} />);
    expect(readFaqSchema()).not.toBeNull();
    unmount();
    expect(readFaqSchema()).toBeNull();
  });
});

describe("FaqItemsWithSchema", () => {
  it("serialises the strings it is given, escaped through the same path", () => {
    const faqs = [
      { question: "Does it handle 3.5 m walls?", answer: "Yes, up to 4 m." },
      { question: 'What about "odd" corners?', answer: "Add the two runs." },
    ];
    renderFaqs(<FaqItemsWithSchema faqs={faqs} title="Custom answers" />);

    expect(
      screen.getByRole("heading", { name: "Custom answers" }),
    ).toBeInTheDocument();
    const schema = readFaqSchema();
    expect(schema.mainEntity[1].name).toBe('What about "odd" corners?');
    expect(schema.mainEntity[1].acceptedAnswer.text).toBe("Add the two runs.");
  });
});

describe("FAQ registry coverage", () => {
  it("resolves every slug a page asks for", async () => {
    // A page pointing at a slug the registry does not hold renders no FAQ and
    // no FAQPage markup at all, and nothing fails loudly. Read the pages and
    // check each slug against the registry that serves them.
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const dir = path.resolve(process.cwd(), "src/pages");
    const files = (await fs.readdir(dir)).filter(
      (file) => file.endsWith(".tsx") && !file.endsWith(".test.tsx"),
    );

    const unresolved: string[] = [];
    for (const file of files) {
      const source = await fs.readFile(path.join(dir, file), "utf8");
      for (const match of source.matchAll(/<ToolFaqs[^>]*slug="([^"]+)"/g)) {
        if (!getToolFaqGroup(match[1])) unresolved.push(`${file}: ${match[1]}`);
      }
    }

    expect(unresolved).toEqual([]);
  });
});

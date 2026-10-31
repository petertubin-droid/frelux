import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import FaqSpotlight from "@/components/seo/FaqSpotlight";
import { getToolFaqGroup } from "@/config/tool-faqs";
import { pickSpotlights, resolveSpotlight } from "@/config/faq-spotlights";

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (key: string) => key, language: "en" }),
}));

function renderSpotlight(
  props: Partial<React.ComponentProps<typeof FaqSpotlight>> = {},
) {
  return render(
    <MemoryRouter>
      <FaqSpotlight placement="learn-article" seed="" {...props} />
    </MemoryRouter>,
  );
}

describe("FaqSpotlight", () => {
  it("advertises the placement's first tool with its real copy", () => {
    renderSpotlight();
    const ad = resolveSpotlight(pickSpotlights("learn-article", "")[0])!;
    const group = getToolFaqGroup(ad.slug)!;

    expect(
      screen.getByRole("heading", { name: `Answers from the ${group.name}` }),
    ).toBeInTheDocument();
    expect(screen.getByText(group.questions[0].q)).toBeInTheDocument();
    expect(screen.getByText("Tool answers")).toBeInTheDocument();
  });

  it("shows the first answer and reveals the second on demand", async () => {
    const user = userEvent.setup();
    renderSpotlight();
    const ad = resolveSpotlight(pickSpotlights("learn-article", "")[0])!;
    const group = getToolFaqGroup(ad.slug)!;

    expect(screen.getByText(group.questions[0].a)).toBeVisible();

    const second = screen.getByRole("button", {
      name: new RegExp(group.questions[3].q.slice(0, 24), "i"),
    });
    expect(second).toHaveAttribute("aria-expanded", "false");
    await user.click(second);
    expect(second).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(group.questions[3].a)).toBeVisible();
  });

  it("links to the advertised tool and to the full question list", () => {
    renderSpotlight();
    const ad = resolveSpotlight(pickSpotlights("learn-article", "")[0])!;
    const group = getToolFaqGroup(ad.slug)!;

    expect(
      screen.getByRole("link", { name: `Open the ${group.name}` }),
    ).toHaveAttribute("href", group.route);
    expect(
      screen.getByRole("link", {
        name: `All ${group.questions.length} answers`,
      }),
    ).toHaveAttribute("href", "/faq");
  });

  it("emits no FAQ markup, because the article owns its own schema", () => {
    const { container } = renderSpotlight();
    expect(
      container.querySelector('script[type="application/ld+json"]'),
    ).toBeNull();
  });

  it("renders nothing at all for a placement with no ads", () => {
    const { container } = renderSpotlight({ placement: "quotes", count: 0 });
    expect(container).toBeEmptyDOMElement();
  });

  it("shows two cards when asked, without duplicating a tool", () => {
    renderSpotlight({
      placement: "learn-library",
      count: 2,
      seed: "library-1",
    });
    const cards = screen.getAllByText("Tool answers");
    expect(cards).toHaveLength(2);
    const headings = screen
      .getAllByRole("heading", { level: 2 })
      .map((node) => node.textContent);
    expect(new Set(headings).size).toBe(2);
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

vi.mock("@/lib/i18n", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/lib/i18n");
  return {
    ...actual,
    useLanguage: () => ({ t: (key: string) => key, language: "en" }),
  };
});

import AuthorByline from "./AuthorByline";
import { EDITORIAL_DESK } from "@/lib/editorial";

function renderByline(props: Parameters<typeof AuthorByline>[0] = {}) {
  return render(
    <MemoryRouter>
      <AuthorByline {...props} />
    </MemoryRouter>,
  );
}

describe("AuthorByline", () => {
  it("shows the desk byline and links the editorial policy", () => {
    renderByline();
    expect(screen.getByText(EDITORIAL_DESK.name)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /editorial standards/i })).toHaveAttribute(
      "href",
      "/editorial",
    );
  });

  it("shows a named reviewer with the credential attached", () => {
    renderByline({
      reviewer: {
        name: "A. Reviewer",
        credential: "Registered Quantity Surveyor (NIQS)",
        role: "Reviewer",
        sameAs: "https://example.org/profile",
        expertise: ["Quantity surveying"],
      },
    });
    expect(screen.getByText(/A\. Reviewer/)).toBeInTheDocument();
    expect(screen.getByText(/NIQS/)).toBeInTheDocument();
  });

  it("prints the review date only when the page records one", () => {
    const { container } = renderByline({ reviewedOn: "2026-11-25" });
    expect(container.textContent).toContain("2026-11-25");
  });
});

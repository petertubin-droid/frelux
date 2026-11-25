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

const seo = vi.hoisted(() => ({ last: null as null | Record<string, unknown> }));
vi.mock("@/lib/seo", async () => {
  const actual = await vi.importActual<Record<string, unknown>>("@/lib/seo");
  return {
    ...actual,
    useSeo: (config: Record<string, unknown>) => {
      seo.last = config;
    },
  };
});

import Editorial from "./Editorial";

function renderPage() {
  return render(
    <MemoryRouter>
      <Editorial />
    </MemoryRouter>,
  );
}

describe("Editorial standards page", () => {
  it("names the publisher, its registration and the review process", () => {
    renderPage();
    expect(screen.getByText("FRELUX Technologies Ltd")).toBeInTheDocument();
    expect(screen.getByText("RC-7492815")).toBeInTheDocument();
    expect(
      screen.getByText(/How a page is reviewed/i),
    ).toBeInTheDocument();
  });

  it("does not pretend to have a named reviewer when none is supplied", () => {
    renderPage();
    expect(
      screen.getByText(/Guides carry the desk byline rather than an individual one/i),
    ).toBeInTheDocument();
  });

  it("carries author and publisher schema for crawlers", () => {
    renderPage();
    const structured = seo.last?.structuredData as Record<string, unknown>;
    expect(structured["@type"]).toBe("AboutPage");
    expect((structured.publisher as Record<string, unknown>)["@type"]).toBe(
      "Organization",
    );
    expect(structured.author).toBeTruthy();
    expect(seo.last?.canonicalPath).toBe("/editorial");
  });
});

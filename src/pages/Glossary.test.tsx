import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

type Call = { method: string; args: unknown[] };
const METHODS = [
  "select",
  "eq",
  "neq",
  "gt",
  "gte",
  "lt",
  "lte",
  "like",
  "ilike",
  "in",
  "is",
  "not",
  "or",
  "and",
  "order",
  "range",
  "limit",
  "single",
  "maybeSingle",
  "textSearch",
];
const state = { __terms: [] as Record<string, unknown>[] };

function makeBuilder() {
  const builder: Record<string, unknown> = {
    then: (
      onFulfilled: (r: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) =>
      Promise.resolve({ data: state.__terms, error: null }).then(
        onFulfilled,
        onRejected,
      ),
  };
  for (const m of METHODS) {
    builder[m] = vi.fn(() => builder);
  }
  return builder;
}

vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn(() => makeBuilder()) },
}));
vi.mock("@/components/ui/AdSlot", () => ({ default: () => null }));

import Glossary from "@/pages/Glossary";

function renderPage() {
  return render(
    <MemoryRouter>
      <Glossary />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  state.__terms = [
    {
      id: "1",
      term: "Screed",
      slug: "screed",
      definition: "A thin layer of cement and sand laid over a floor slab.",
      category: "finishes",
      sort_order: 1,
      is_active: true,
    },
    {
      id: "2",
      term: "Primer",
      slug: "primer",
      definition: "A preparatory coating applied before paint.",
      category: "materials",
      sort_order: 2,
      is_active: true,
    },
  ];
});

describe("Glossary", () => {
  it("renders terms grouped under category headings", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Screed")).toBeInTheDocument());
    expect(screen.getAllByText("Materials").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Finishes").length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(/thin layer of cement and sand/i),
    ).toBeInTheDocument();
  });

  it("filters by search text", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Screed")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/Search a term/i), {
      target: { value: "primer" },
    });
    expect(screen.getByText("Primer")).toBeInTheDocument();
    expect(screen.queryByText("Screed")).not.toBeInTheDocument();
  });

  it("filters by category chip", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Screed")).toBeInTheDocument());
    fireEvent.click(screen.getByRole("button", { name: "Finishes" }));
    expect(screen.getByText("Screed")).toBeInTheDocument();
    expect(screen.queryByText("Primer")).not.toBeInTheDocument();
  });

  it("shows a no-match message for unknown searches", async () => {
    renderPage();
    await waitFor(() => expect(screen.getByText("Screed")).toBeInTheDocument());
    fireEvent.change(screen.getByPlaceholderText(/Search a term/i), {
      target: { value: "zzzzz" },
    });
    expect(screen.getByText(/No terms match that search/i)).toBeInTheDocument();
  });
});

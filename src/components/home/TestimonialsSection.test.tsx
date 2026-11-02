import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";

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

function makeBuilder(resultFor: (calls: Call[]) => unknown) {
  const calls: Call[] = [];
  const builder: Record<string, unknown> = {
    then: (
      onFulfilled: (r: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown,
    ) => Promise.resolve(resultFor(calls)).then(onFulfilled, onRejected),
  };
  for (const m of METHODS) {
    builder[m] = vi.fn((...args: unknown[]) => {
      calls.push({ method: m, args });
      return builder;
    });
  }
  return builder;
}

const mockTestimonial = {
  __data: null as unknown[] | null,
};

vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: vi.fn(() =>
      makeBuilder(() => ({ data: mockTestimonial.__data, error: null })),
    ),
  },
}));

import TestimonialsSection from "@/components/home/TestimonialsSection";

beforeEach(() => {
  vi.clearAllMocks();
  mockTestimonial.__data = null;
});

describe("TestimonialsSection", () => {
  it("renders nothing while loading or when the table is empty", async () => {
    const { container } = render(<TestimonialsSection />);
    // First render: query in flight, nothing visible.
    expect(container.innerHTML).toBe("");
    // After the (empty) result resolves: still nothing.
    await waitFor(() => {
      expect(container.innerHTML).toBe("");
    });
  });

  it("renders real testimonials when they exist", async () => {
    mockTestimonial.__data = [
      {
        id: "t-1",
        quote: "The paint calculator saved me from buying two extra buckets.",
        author_name: "Amara O.",
        author_role: "Homeowner",
        author_location: "Lagos",
        is_active: true,
        sort_order: 1,
        created_at: "2026-10-09T00:00:00Z",
      },
    ];
    const { container } = render(<TestimonialsSection />);
    await waitFor(() => {
      expect(
        screen.getByText(/saved me from buying two extra buckets/i),
      ).toBeInTheDocument();
    });
    expect(screen.getByText("Amara O.")).toBeInTheDocument();
    expect(screen.getByText("Homeowner · Lagos")).toBeInTheDocument();
    expect(container.innerHTML).not.toBe("");
  });
});

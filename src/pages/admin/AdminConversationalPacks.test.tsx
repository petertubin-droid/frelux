/**
 * Admin Conversational Packs pane tests (Engine 3)
 *
 * The engine's language detection is covered by
 * conversational-engine.test.ts. These pin the admin wiring:
 * pack listing, the mandatory source-reference validation
 * (nothing configured without provenance), and the parse log
 * view.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

const packsFixture = [
  {
    id: "p1",
    language_code: "en",
    category: "greeting",
    keywords: ["hello", "good afternoon"],
    weight: 1,
    description: null,
    source_reference: "FRELUX conversational seed v1",
    is_active: true,
    sort_order: 110,
  },
  {
    id: "p2",
    language_code: "en",
    category: "surface_paint",
    keywords: ["paint", "painting"],
    weight: 2,
    description: null,
    source_reference: "FRELUX conversational seed v1",
    is_active: true,
    sort_order: 220,
  },
];

const logFixture = [
  {
    id: "l1",
    raw_thread: "Good afternoon, how much is paint for a 2 bedroom flat",
    detected_language: "en",
    intent: "paint",
    extracted_params: { "Job type": "Paint job" },
    had_estimate: false,
    language_override: false,
    created_at: "2026-10-03T06:00:00Z",
  },
];

vi.mock("@/lib/estimation/queries", () => ({
  fetchConversationalPacks: vi
    .fn()
    .mockResolvedValue({ data: packsFixture, error: null }),
  fetchConversationalParseLog: vi
    .fn()
    .mockResolvedValue({ data: logFixture, error: null }),
  createConversationalPack: vi.fn().mockResolvedValue({ error: null }),
  updateConversationalPack: vi.fn().mockResolvedValue({ error: null }),
  deleteConversationalPack: vi.fn().mockResolvedValue({ error: null }),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const Comp = (await import("@/pages/admin/AdminConversationalPacks")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("AdminConversationalPacks", () => {
  it("lists configured packs with their source references", async () => {
    await renderPage();
    expect(
      await screen.findByText(/hello, good afternoon/),
    ).toBeInTheDocument();
    expect(screen.getByText(/paint, painting/)).toBeInTheDocument();
    expect(
      screen.getAllByText(/FRELUX conversational seed v1/).length,
    ).toBeGreaterThan(0);
  });

  it("shows the recent parse log with what was asked and whether it estimated", async () => {
    await renderPage();
    expect(await screen.findByText(/Recent parses/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Asked back/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^en$/).length).toBeGreaterThan(0);
    // The log shows the thread itself (truncated), not just a status
    expect(
      screen.getByText(/Good afternoon, how much is paint for/),
    ).toBeInTheDocument();
  });

  it("refuses to save a pack without a source reference — nothing configured without provenance", async () => {
    await renderPage();
    fireEvent.click(await screen.findByRole("button", { name: /add pack/i }));
    // Fill keywords but NOT the source reference: the pack must be refused.
    fireEvent.change(await screen.findByLabelText(/keywords/i), {
      target: { value: "wetin, sabi" },
    });
    fireEvent.click(screen.getByRole("button", { name: /^create pack$/i }));
    await waitFor(() => {
      expect(
        screen.getByText(/source reference is required/i),
      ).toBeInTheDocument();
    });
    const { createConversationalPack } =
      await import("@/lib/estimation/queries");
    expect(createConversationalPack).not.toHaveBeenCalled();
  });
});

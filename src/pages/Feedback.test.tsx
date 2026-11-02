import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

const insertMock = vi.fn((_row: Record<string, unknown>) =>
  Promise.resolve({ error: null }),
);

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/supabase", () => ({
  supabase: { from: vi.fn(() => ({ insert: insertMock })) },
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

async function renderPage() {
  const Comp = (await import("@/pages/Feedback")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("Feedback page", () => {
  it("renders the form", async () => {
    await renderPage();
    // PageHeader titles are split into per-word spans for the stagger reveal,
    // so match on the heading accessible name instead of a single text node.
    expect(
      await screen.findByRole("heading", { name: /Feedback & Suggestions/i }),
    ).toBeTruthy();
    expect(screen.getByLabelText(/What is this about\?/i)).toBeTruthy();
  });

  it("submits a suggestion to feedback_suggestions", async () => {
    await renderPage();
    const msg = screen.getByLabelText(/Your suggestion or feedback/i);
    fireEvent.change(msg, {
      target: { value: "Please add a roofing calculator" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send to the team/i }));
    await waitFor(() => expect(insertMock).toHaveBeenCalledTimes(1));
    const row = insertMock.mock.calls[0]?.[0] as Record<string, unknown>;
    expect(row.kind).toBe("feature_request");
    expect(row.message).toBe("Please add a roofing calculator");
  });

  it("shows the thank-you state after submitting", async () => {
    await renderPage();
    fireEvent.change(screen.getByLabelText(/Your suggestion or feedback/i), {
      target: { value: "Great site!" },
    });
    fireEvent.click(screen.getByRole("button", { name: /send to the team/i }));
    expect(await screen.findByText(/Thank you!/i)).toBeTruthy();
  });

  it("blocks empty submissions", async () => {
    await renderPage();
    fireEvent.click(screen.getByRole("button", { name: /send to the team/i }));
    await waitFor(() =>
      expect(screen.getByText(/describe your idea/i)).toBeTruthy(),
    );
    expect(insertMock).not.toHaveBeenCalled();
  });
});

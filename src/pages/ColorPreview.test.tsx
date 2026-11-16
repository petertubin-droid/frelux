import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

// Record what the page tells search engines while still running the real hook,
// so the shell keeps the page's own decision not to be indexed.
const seoCalls = vi.hoisted(() => [] as Array<Record<string, unknown>>);
vi.mock("@/lib/seo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/seo")>();
  return {
    ...actual,
    useSeo: (config: Record<string, unknown> | null) => {
      if (config) seoCalls.push(config);
      return actual.useSeo(config as never);
    },
  };
});

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderPage() {
  const Comp = (await import("@/pages/ColorPreview")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("ColorPreview", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("stays out of the index and takes its search copy from the catalogue", async () => {
    seoCalls.length = 0;
    const { findByRole } = await renderPage();

    // The heading comes from the catalogue entry, not from a title written in
    // the page, so the menu label and the page heading cannot drift apart.
    expect(
      await findByRole("heading", { name: /before & after preview/i }),
    ).toBeTruthy();

    const page = seoCalls.find((c) => c.canonicalPath === "/color-preview");
    expect(page).toBeTruthy();
    expect(page?.noIndex).toBe(true);
    expect(String(page?.title)).toMatch(/color preview/i);
  });
});

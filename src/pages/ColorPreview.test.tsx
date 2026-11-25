import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

// Record what the page tells search engines while still running the real hook,
// so the shell keeps the page's own decision not to be indexed.
const pageMocks = vi.hoisted(() => ({
  seoCalls: [] as Array<Record<string, unknown>>,
  useAuth: vi.fn(() => ({ user: null as unknown, loading: false })),
  aiColorPreview: vi.fn(),
}));
vi.mock("@/lib/seo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/seo")>();
  return {
    ...actual,
    useSeo: (config: Record<string, unknown> | null) => {
      if (config) pageMocks.seoCalls.push(config);
      return actual.useSeo(config as never);
    },
  };
});

vi.mock("@/lib/auth", () => ({ useAuth: pageMocks.useAuth }));
vi.mock("@/lib/ai-project", () => ({ aiColorPreview: pageMocks.aiColorPreview }));
vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

beforeEach(() => {
  vi.clearAllMocks();
  pageMocks.useAuth.mockImplementation(() => ({ user: null, loading: false }));
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
    pageMocks.seoCalls.length = 0;
    const { findByRole } = await renderPage();

    // The heading comes from the catalogue entry, not from a title written in
    // the page, so the menu label and the page heading cannot drift apart.
    // Level 1: the shell also renders a questions section whose title contains
    // the page name, and that section is correct content rather than a second
    // page heading.
    expect(
      await findByRole("heading", {
        level: 1,
        name: /before & after preview/i,
      }),
    ).toBeTruthy();

    const page = pageMocks.seoCalls.find((c) => c.canonicalPath === "/color-preview");
    expect(page).toBeTruthy();
    expect(page?.noIndex).toBe(true);
    expect(String(page?.title)).toMatch(/color preview/i);
  });

  it("renders the real generated image and practical recommendations", async () => {
    pageMocks.useAuth.mockImplementation(() => ({ user: { id: "user-1" }, loading: false }));
    pageMocks.aiColorPreview.mockResolvedValue({
      previewImageUrl: "data:image/png;base64,AQID",
      previewDescription: "Paint the window wall in slate and keep the other walls warm white.",
      decorAdvice: "Pair it with oak furniture and linen curtains.",
      colorSuggestions: [],
      applicationTips: [],
    });

    const { findByRole, findByText, getByRole } = await renderPage();
    getByRole("button", { name: /generate ai preview/i }).click();
    expect(await findByRole("img", { name: /ai generated room design preview/i })).toBeTruthy();
    expect(await findByText(/keep the other walls warm white/i)).toBeTruthy();
    expect(await findByText(/oak furniture and linen curtains/i)).toBeTruthy();
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false, isPaid: false })),
}));

vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

beforeEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

async function renderNavbar(initialEntries = ["/"]) {
  const Navbar = (await import("@/components/layout/Navbar")).default;
  const { CreditsProvider } = await import("@/lib/credits-context");
  const { CurrencyProvider } =
    await import("@/lib/international/currency-context");
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <ToastProvider>
        <CreditsProvider>
          <CurrencyProvider>
            <Navbar />
          </CurrencyProvider>
        </CreditsProvider>
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("Navbar", () => {
  it("renders without crashing", async () => {
    const { container } = await renderNavbar();
    expect(container.innerHTML).not.toBe("");
  });

  it("traps focus in the mobile drawer and closes with Escape", async () => {
    await renderNavbar();
    const trigger = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(trigger);
    const drawer = await screen.findByRole("dialog", {
      name: "FRELUX navigation menu",
    });
    await waitFor(() =>
      expect(document.activeElement).toHaveAttribute(
        "aria-label",
        "Close menu",
      ),
    );
    expect(drawer).not.toHaveProperty("inert", true);
    const focusable = drawer.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const last = focusable[focusable.length - 1];
    last.focus();
    fireEvent.keyDown(document, { key: "Tab" });
    expect(document.activeElement).toBe(focusable[0]);

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(
        screen.queryByRole("dialog", { name: "FRELUX navigation menu" }),
      ).toBeNull(),
    );
    await waitFor(() => expect(trigger).toHaveFocus());
    expect(drawer).toHaveProperty("inert", true);
  });

  it("filters the menu by what the visitor types", async () => {
    await renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const drawer = await screen.findByRole("dialog", {
      name: "FRELUX navigation menu",
    });
    const search = within(drawer).getByRole("searchbox", {
      name: "Search tools and pages",
    });
    fireEvent.change(search, { target: { value: "unit conv" } });
    const hit = await within(drawer).findByRole("link", {
      name: /Unit Converter/i,
    });
    expect(hit).toHaveAttribute("href", "/unit-converter");
    // A page that does not match is gone rather than merely dimmed.
    expect(within(drawer).queryByRole("link", { name: "Learn" })).toBeNull();

    fireEvent.change(search, { target: { value: "zzzzz" } });
    expect(within(drawer).getByText("No matches")).toBeInTheDocument();
  });

  it("names both sections of the menu so a search result has a home", async () => {
    await renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const drawer = await screen.findByRole("dialog", {
      name: "FRELUX navigation menu",
    });
    expect(within(drawer).getByText("Estimate & build")).toBeInTheDocument();
    expect(within(drawer).getByText("Explore & trade")).toBeInTheDocument();
    expect(within(drawer).getByText("Manage & learn")).toBeInTheDocument();
  });

  it("includes the roadmap in the Learn navigation menu", async () => {
    await renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const drawer = await screen.findByRole("dialog", {
      name: "FRELUX navigation menu",
    });
    fireEvent.click(within(drawer).getByRole("button", { name: "Learn" }));
    expect(
      await within(drawer).findByRole("link", { name: "Roadmap" }),
    ).toHaveAttribute("href", "/roadmap");
  });

  it("includes header container for ad-free prompt notices", async () => {
    const { container } = await renderNavbar();
    const header = container.querySelector("header");
    expect(header).not.toBeNull();
  });
});

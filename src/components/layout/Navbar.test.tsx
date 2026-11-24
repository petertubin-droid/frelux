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

vi.mock("@/components/ui/MarketSelector", () => ({
  MarketSelector: () => null,
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

  it("keeps the closed drawer out of the document entirely", async () => {
    // Regression guard for the homepage flash: while the drawer markup was
    // rendered closed, a phone painted the whole menu before the stylesheet
    // settled, then watched it snap away. Closed must mean absent.
    const { container } = await renderNavbar();
    expect(
      screen.queryByRole("dialog", { name: "FRELUX navigation menu" }),
    ).toBeNull();
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(container.innerHTML).not.toContain("FRELUX navigation menu");
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
    // The drawer is unmounted when it closes, so nothing of it stays in the
    // tab order (or in the prerendered HTML, where it used to flash open).
    expect(document.contains(drawer)).toBe(false);
  });

  it("opens a profile menu with identity, balance and sections", async () => {
    const { useAuth } = await import("@/lib/auth");
    (
      useAuth as unknown as { mockReturnValue: (v: unknown) => void }
    ).mockReturnValue({
      user: { email: "ada@example.com" },
      profile: { full_name: "Ada Obi" },
      loading: false,
      isPaid: true,
      signOut: vi.fn(),
    });
    await renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: "Account menu" }));
    const menu = await screen.findByRole("menu", { name: "Your account" });
    expect(within(menu).getByText("Ada Obi")).toBeInTheDocument();
    expect(within(menu).getByText("ada@example.com")).toBeInTheDocument();
    expect(within(menu).getByText("Paid plan")).toBeInTheDocument();
    expect(within(menu).getByText("Credits")).toBeInTheDocument();
    expect(within(menu).getByText("Total Owned")).toBeInTheDocument();
    expect(within(menu).getByText("Business")).toBeInTheDocument();
    expect(
      within(menu).getByRole("button", { name: "Sign out" }),
    ).toBeInTheDocument();
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

  it("keeps the internal roadmap out of the Learn navigation menu", async () => {
    await renderNavbar();
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const drawer = await screen.findByRole("dialog", {
      name: "FRELUX navigation menu",
    });
    fireEvent.click(within(drawer).getByRole("button", { name: "Learn" }));
    // The roadmap listed unshipped work and internal gaps, so it is not a
    // public destination any more.
    await within(drawer).findByRole("link", { name: "User Guide" });
    expect(screen.queryByRole("link", { name: "Roadmap" })).toBeNull();
  });

  it("includes header container for ad-free prompt notices", async () => {
    const { container } = await renderNavbar();
    const header = container.querySelector("header");
    expect(header).not.toBeNull();
  });

  it("excludes AI credits section and legacy dashboard card from mobile drawer", async () => {
    await renderNavbar();
    const trigger = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(trigger);
    const drawer = await screen.findByRole("dialog", {
      name: "FRELUX navigation menu",
    });
    expect(within(drawer).queryByText(/AI Credits/i)).toBeNull();
    expect(within(drawer).queryByText(/Credit balance/i)).toBeNull();
    expect(within(drawer).queryByText(/Quick tools/i)).toBeNull();
  });

  it("leaves the section holding the current page open, and the rest folded", async () => {
    // Standing on a Building Structure tool: that section is the one open, so
    // the visitor can see where they are without a tap, and the other sections
    // stay folded so the list is short.
    await renderNavbar(["/german-floor-calculator"]);
    fireEvent.click(screen.getByRole("button", { name: "Open menu" }));
    const drawer = await screen.findByRole("dialog", {
      name: "FRELUX navigation menu",
    });
    fireEvent.click(
      within(drawer).getByRole("button", { name: "Construction Tools" }),
    );

    const structureBtn = await within(drawer).findByRole("button", {
      name: /Building Structure/i,
    });
    expect(structureBtn.getAttribute("aria-expanded")).toBe("true");
    expect(
      within(drawer).getByRole("link", { name: /German Floor/i }),
    ).toBeDefined();

    // Every other section in the same workspace is folded.
    const otherSections = within(drawer)
      .getAllByRole("button")
      .filter(
        (button) =>
          button.getAttribute("aria-controls") &&
          !/Building Structure/i.test(button.textContent ?? ""),
      );
    expect(otherSections.length).toBeGreaterThan(0);
    for (const section of otherSections) {
      expect(section.getAttribute("aria-expanded")).toBe("false");
    }
  });

  it("folds the tool categories by default and opens the one you ask for", async () => {
    await renderNavbar();
    const trigger = screen.getByRole("button", { name: "Open menu" });
    fireEvent.click(trigger);
    const drawer = await screen.findByRole("dialog", {
      name: "FRELUX navigation menu",
    });
    fireEvent.click(
      within(drawer).getByRole("button", { name: "Construction Tools" }),
    );

    // Categories arrive folded: the section headers are buttons you can see,
    // and their tools are hidden, so the drawer is a short list rather than a
    // sixty-tool wall.
    const structureBtn = await within(drawer).findByRole("button", {
      name: /Building Structure/i,
    });
    expect(structureBtn.getAttribute("aria-expanded")).toBe("false");
    expect(within(drawer).queryByRole("link", { name: /German Floor/i })).toBeNull();

    // Opening one reveals its tools and only its tools.
    fireEvent.click(structureBtn);
    expect(structureBtn.getAttribute("aria-expanded")).toBe("true");
    expect(
      within(drawer).getByRole("link", { name: /German Floor/i }),
    ).toBeDefined();

    // And it folds again.
    fireEvent.click(structureBtn);
    expect(structureBtn.getAttribute("aria-expanded")).toBe("false");
  });
});

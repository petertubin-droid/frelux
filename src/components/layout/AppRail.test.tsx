import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  render,
  screen,
  fireEvent,
  waitFor,
  within,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AppRail from "./AppRail";

// The rail reads auth for the app variant and i18n for labels; both are
// stubbed so the test stays about the navigation arrangement itself.
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: null, profile: null, signOut: vi.fn() }),
}));

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (value: string) => value, language: "en" }),
}));

const renderRail = (path = "/") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppRail />
    </MemoryRouter>,
  );

describe("AppRail", () => {
  beforeEach(() => {
    window.localStorage.clear();
    document.documentElement.removeAttribute("data-rail");
  });

  it("renders every workspace as a destination", () => {
    renderRail();
    const nav = screen.getByRole("navigation", { name: "Site sections" });
    expect(nav).toBeInTheDocument();
    for (const label of [
      "Construction Tools",
      "Market Intelligence",
      "Colors & Design",
      "Services",
      "Projects",
      "Learn",
    ]) {
      expect(screen.getAllByLabelText(label).length).toBeGreaterThan(0);
    }
  });

  it("marks the current workspace for assistive technology", () => {
    renderRail("/");
    const link = screen
      .getAllByRole("link", { name: "Home" })
      .find((element) => element.getAttribute("aria-current") === "page");
    expect(link).toBeDefined();
  });

  it("starts expanded and remembers a collapsed choice", async () => {
    renderRail();
    const toggle = screen.getByRole("button", {
      name: "Collapse navigation",
    });
    expect(document.documentElement.dataset.rail).toBe("expanded");

    fireEvent.click(toggle);

    await waitFor(() => {
      expect(document.documentElement.dataset.rail).toBe("collapsed");
    });
    expect(window.localStorage.getItem("frelux.rail.collapsed")).toBe("1");
    expect(
      screen.getByRole("button", { name: "Expand navigation" }),
    ).toBeInTheDocument();
  });

  it("opens a grouped flyout and closes it with Escape", async () => {
    renderRail();
    const trigger = screen.getByRole("button", { name: "Construction Tools" });
    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    // A real tool from the Construction Tools registry proves the grouped
    // children rendered, and its section heading proves the grouping held.
    expect(await screen.findByText("Paint Calculator")).toBeInTheDocument();
    expect(await screen.findByText("Materials & Finishes")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => {
      expect(trigger).toHaveAttribute("aria-expanded", "false");
    });
  });

  it("asks the command palette to open instead of owning search", () => {
    renderRail();
    const dispatched: string[] = [];
    const listener = (event: Event) =>
      dispatched.push((event as KeyboardEvent).key);
    document.addEventListener("keydown", listener);
    fireEvent.click(screen.getByRole("button", { name: "Search" }));
    document.removeEventListener("keydown", listener);
    expect(dispatched).toContain("k");
  });

  it("exposes every workspace and every tool, so no destination is orphaned", async () => {
    renderRail();
    const workspaces = screen.getByRole("navigation", {
      name: "Site sections",
    });
    // Every top-level workspace is reachable from the rail.
    for (const label of [
      "Home",
      "Convert & Explore",
      "Construction Tools",
      "Market Intelligence",
      "Colors & Design",
      "Services",
      "Projects",
      "Learn",
    ]) {
      expect(
        within(workspaces).getAllByLabelText(label).length,
      ).toBeGreaterThanOrEqual(1);
    }

    // The biggest flyout holds all 46 tools; opening it must show every one.
    fireEvent.click(
      within(workspaces).getByRole("button", { name: "Construction Tools" }),
    );
    const { navWorkspaces } = await import("@/config/site");
    const tools =
      navWorkspaces.find((entry) => entry.label === "Construction Tools")
        ?.children ?? [];
    expect(tools.length).toBe(46);
    for (const tool of tools) {
      expect(screen.getAllByText(tool.label).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("keeps the desktop-only contract the layouts depend on", () => {
    const { container } = renderRail();
    const rail = container.querySelector("aside");
    // Hidden below lg, flex at lg and up: tablets and phones keep the drawer.
    const classes = rail?.className ?? "";
    expect(classes).toContain("hidden");
    expect(classes).toContain("lg:flex");
    expect(classes).toContain("fixed");
    // The offset variable is the single source of layout truth.
    expect(rail?.getAttribute("data-collapsed")).toBe("false");
  });

  it("exposes the rail brand as the site home link", () => {
    // Desktop hides the header brand, so this link is the only way home that
    // a desktop visitor or screen reader gets.
    renderRail();
    const brand = screen.getByRole("link", { name: "FRELUX home" });
    expect(brand).toHaveAttribute("href", "/");
  });

  it("routes the settings button to the single drawer", () => {
    renderRail();
    const opened = vi.fn();
    window.addEventListener("frelux:open-menu", opened);
    fireEvent.click(
      screen.getByRole("button", { name: "Settings and display" }),
    );
    window.removeEventListener("frelux:open-menu", opened);
    expect(opened).toHaveBeenCalledTimes(1);
  });

  // Regression: the panel used to close on any scroll because the listener ran
  // in the capture phase and caught scrolls inside the panel itself, so the
  // moment a visitor scrolled the tool list it vanished.
  it("survives scrolling its own list, and still closes when the page scrolls", async () => {
    renderRail();
    const trigger = screen.getByRole("button", { name: "Construction Tools" });
    fireEvent.click(trigger);
    const heading = await screen.findByText("Materials & Finishes");
    const scroller = heading.closest(".overflow-y-auto");
    expect(scroller).not.toBeNull();

    fireEvent.scroll(scroller!);
    expect(screen.getByText("Materials & Finishes")).toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    fireEvent.scroll(window);
    await waitFor(() => {
      expect(
        screen.queryByText("Materials & Finishes"),
      ).not.toBeInTheDocument();
    });
  });

  // Regression: a full-viewport click-away layer sat over the rail, so the next
  // workspace never received the hover and the panel looked stuck.
  it("closes on a press outside the panel and stays on a press inside", async () => {
    renderRail();
    const trigger = screen.getByRole("button", { name: "Construction Tools" });
    fireEvent.click(trigger);
    const heading = await screen.findByText("Materials & Finishes");

    fireEvent.pointerDown(heading);
    expect(heading).toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    await waitFor(() => {
      expect(
        screen.queryByText("Materials & Finishes"),
      ).not.toBeInTheDocument();
    });
  });

  it("does not put a full-screen layer over the rail while open", async () => {
    renderRail();
    fireEvent.click(screen.getByRole("button", { name: "Construction Tools" }));
    await screen.findByText("Materials & Finishes");
    const covering = document.querySelector(".fixed.inset-0");
    expect(covering).toBeNull();
  });
});

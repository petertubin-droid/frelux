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

/** Open the labelled column, which a first visit deliberately leaves closed. */
const openColumn = (path = "/") => {
  const view = renderRail(path);
  fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));
  return view;
};

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

  it("arrives as a quiet icon rail and opens with the book control", async () => {
    renderRail();
    // First paint is the icon rail: the section list is not thrown at you.
    expect(document.documentElement.dataset.rail).toBe("collapsed");
    expect(
      screen.queryByRole("navigation", { name: "Home" }),
    ).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Open navigation" }));

    await waitFor(() => {
      expect(document.documentElement.dataset.rail).toBe("expanded");
    });
    expect(screen.getByRole("navigation", { name: "Home" })).toBeInTheDocument();
    expect(window.localStorage.getItem("frelux.rail.collapsed")).toBe("0");

    // The same control sends it back in.
    fireEvent.click(screen.getByRole("button", { name: "Close navigation" }));
    await waitFor(() => {
      expect(document.documentElement.dataset.rail).toBe("collapsed");
    });
    expect(window.localStorage.getItem("frelux.rail.collapsed")).toBe("1");
  });

  it("shows the current workspace's destinations inline, without a overlay", async () => {
    openColumn("/paint-calculator");
    // The labelled column belongs to the workspace the visitor is in.
    const column = screen.getByRole("navigation", {
      name: "Construction Tools",
    });
    expect(column).toBeInTheDocument();
    expect(within(column).getByText("Paint Calculator")).toBeInTheDocument();
    expect(
      within(column).getByText("Materials & Finishes"),
    ).toBeInTheDocument();
    // Nothing floats: the old bug came from a portalled panel over the page.
    expect(document.querySelector('[id^="rail-flyout-"]')).toBeNull();
    expect(document.querySelector(".fixed.inset-0")).toBeNull();
  });

  it("scrolls the column on its own, inside a fixed shell", async () => {
    openColumn("/paint-calculator");
    const column = screen.getByRole("navigation", {
      name: "Construction Tools",
    });
    expect(column.className).toContain("overflow-y-auto");
    expect(column.className).toContain("overscroll-contain");
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

  it("exposes every workspace, and every tool of the workspace you are in", async () => {
    openColumn("/paint-calculator");
    const workspaces = screen.getByRole("navigation", {
      name: "Site sections",
    });
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

    // Every destination of the current workspace is listed, not a subset.
    const { navWorkspaces } = await import("@/config/site");
    const tools =
      navWorkspaces.find((entry) => entry.label === "Construction Tools")
        ?.children ?? [];
    expect(tools.length).toBe(46);
    for (const tool of tools) {
      expect(screen.getAllByText(tool.label).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("switches the column when another workspace is chosen", async () => {
    openColumn("/paint-calculator");
    expect(
      screen.getByRole("navigation", { name: "Construction Tools" }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Market Intelligence"));
    await waitFor(() => {
      expect(
        screen.queryByRole("navigation", { name: "Construction Tools" }),
      ).toBeNull();
      expect(
        screen.getByRole("navigation", { name: "Market Intelligence" }),
      ).toBeInTheDocument();
    });
  });

  it("keeps the desktop-only contract the layouts depend on", () => {
    const { container } = renderRail();
    const rail = container.querySelector("aside");
    // Hidden below lg, flex at lg and up: tablets and phones keep the drawer.
    const classes = rail?.className ?? "";
    expect(classes).toContain("hidden");
    expect(classes).toContain("lg:flex");
    expect(classes).toContain("fixed");
    // The offset variable is the single source of layout truth, and a first
    // visit is the icon rail: the section list is opened, never pushed at you.
    expect(rail?.getAttribute("data-collapsed")).toBe("true");
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
});

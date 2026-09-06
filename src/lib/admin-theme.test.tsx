import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, cleanup, act } from "@testing-library/react";
import {
  AdminThemeProvider,
  useAdminTheme,
} from "@/lib/admin-theme";

describe("AdminThemeProvider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove("dark");
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: false }));
  });

  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    localStorage.clear();
    document.documentElement.classList.remove("dark");
  });

  it("persists to the admin-only key and never touches the public theme key", () => {
    localStorage.setItem("theme", "light");
    let ctx: ReturnType<typeof useAdminTheme> | null = null;
    const Probe = () => {
      ctx = useAdminTheme();
      return null;
    };
    render(
      <AdminThemeProvider>
        <Probe />
      </AdminThemeProvider>,
    );
    expect(ctx!.theme).toBe("light");
    act(() => {
      ctx!.toggle();
    });
    expect(localStorage.getItem("frelux_admin_theme")).toBe("dark");
    // The public visitor preference must remain untouched by the admin toggle.
    expect(localStorage.getItem("theme")).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("restores the public theme (including its dark preference) on unmount", () => {
    localStorage.setItem("theme", "dark");
    const { unmount } = render(<AdminThemeProvider>{null}</AdminThemeProvider>);
    unmount();
    // Cleanup hands the dark class back to the public theme preference.
    expect(document.documentElement.classList.contains("dark")).toBe(true);
  });

  it("restores the public light theme on unmount when the visitor prefers light", () => {
    localStorage.setItem("theme", "light");
    let ctx: ReturnType<typeof useAdminTheme> | null = null;
    const Probe = () => {
      ctx = useAdminTheme();
      return null;
    };
    const { unmount } = render(
      <AdminThemeProvider>
        <Probe />
      </AdminThemeProvider>,
    );
    act(() => {
      ctx!.toggle();
    });
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    unmount();
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });

  it("reads its own stored preference on mount, independent of the public theme", () => {
    localStorage.setItem("theme", "dark");
    localStorage.setItem("frelux_admin_theme", "light");
    let ctx: ReturnType<typeof useAdminTheme> | null = null;
    const Probe = () => {
      ctx = useAdminTheme();
      return null;
    };
    render(
      <AdminThemeProvider>
        <Probe />
      </AdminThemeProvider>,
    );
    // Admin preference (light) wins on the admin surface even though the
    // public visitor preference is dark — the two states are independent.
    expect(ctx!.theme).toBe("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminEngineReconciliation } from "./AdminEngineReconciliation";
import {
  buildEngineManifest,
  summariseManifest,
} from "@/lib/ai-foundation/engine-manifest";

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({ t: (key: string) => key, language: "en" }),
}));

const manifest = buildEngineManifest();
const summary = summariseManifest(manifest);

describe("AdminEngineReconciliation", () => {
  it("renders the composed manifest", () => {
    render(<AdminEngineReconciliation />);
    expect(
      screen.getByText(new RegExp(`${summary.total} engines`)),
    ).toBeInTheDocument();
    expect(screen.getAllByRole("row").length).toBe(manifest.length + 1);
  });

  it("lists engines only the capability register knows", () => {
    render(<AdminEngineReconciliation />);
    const capabilityOnly = manifest.filter(
      (m) => m.sources.capabilityId && m.sources.aiEngineIds.length === 0,
    )[0];
    expect(screen.getAllByText(capabilityOnly.id).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2 missing/).length).toBeGreaterThan(0);
  });

  it("keeps unresolved engines visible with their reason", () => {
    render(<AdminEngineReconciliation />);
    const unresolved = manifest.find((m) =>
      m.sources.aiEngineIds.includes("painting_wall_area"),
    );
    expect(unresolved).toBeDefined();
    const row = screen
      .getAllByRole("row")
      .find((r) => r.textContent?.includes("painting_wall_area"))!;
    expect(within(row).getAllByText(/missing$/).length).toBeGreaterThan(0);
    expect(within(row).getByText(/unresolved/)).toBeInTheDocument();
  });

  it("filters by search and by gap", async () => {
    const user = userEvent.setup();
    render(<AdminEngineReconciliation />);
    await user.type(screen.getByLabelText("Search engines"), "painting");
    const painted = screen
      .getAllByRole("row")
      .filter((r) => r.textContent?.toLowerCase().includes("paint"));
    expect(painted.length).toBeGreaterThan(0);
    expect(
      screen.queryByText("engine_structural_beam"),
    ).not.toBeInTheDocument();

    await user.clear(screen.getByLabelText("Search engines"));
    await user.click(
      screen.getByLabelText(/Only engines one register cannot see/i),
    );
    const shown = Number(
      screen
        .getByText(/Showing \d+ of \d+/)
        .textContent!.match(/Showing (\d+)/)![1],
    );
    expect(shown).toBeLessThan(manifest.length);
    expect(shown).toBeGreaterThan(0);
  });
});

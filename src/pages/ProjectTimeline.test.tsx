import { describe, it, expect, vi, beforeEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

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
  const Comp = (await import("@/pages/ProjectTimeline")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("ProjectTimeline", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});

describe("ProjectTimeline blank dimensions", () => {
  it("refuses a building with no length and names the field", async () => {
    const { container } = await renderPage();
    // A schedule for a 0 m building is a fabricated schedule: the engine floors
    // the area factor at 0.5, so it would happily return full stage durations.
    const length = container.querySelector(
      "#timeline-length",
    ) as HTMLInputElement;
    fireEvent.change(length, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /Estimate Timeline/i }));

    const notice = screen.getByTestId("missing-fields-notice");
    expect(notice.textContent).toContain("Length");
    // The result line is stated under the heading and again in the About
    // This Tool block, so presence is the assertion, not a unique match.
    expect(screen.queryAllByText(/Stage-by-stage/i).length).toBeGreaterThan(0);
    // The stage table must be gone rather than left over from the last press.
    // The lede and the registered questions legitimately mention the critical
    // path, so the guard names the results heading itself.
    expect(container.textContent).not.toMatch(/Stage-by-Stage Breakdown/i);
  });

  it("clears the notice once the footprint is whole again", async () => {
    const { container } = await renderPage();
    const length = container.querySelector(
      "#timeline-length",
    ) as HTMLInputElement;
    fireEvent.change(length, { target: { value: "" } });
    fireEvent.click(screen.getByRole("button", { name: /Estimate Timeline/i }));
    expect(screen.getByTestId("missing-fields-notice")).toBeTruthy();

    fireEvent.change(length, { target: { value: "18" } });
    fireEvent.click(screen.getByRole("button", { name: /Estimate Timeline/i }));
    expect(screen.queryByTestId("missing-fields-notice")).toBeNull();
  });
});

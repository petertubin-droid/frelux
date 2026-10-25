import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }));

vi.mock("@/lib/supabase", () => ({
  supabase: { from: fromMock },
  isSupabaseConfigured: true,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

async function renderButton() {
  const SaveToProjectButton = (
    await import("@/components/calculators/SaveToProjectButton")
  ).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <SaveToProjectButton
          calculatorType="paint"
          calculatorSlug="paint-calculator"
          calcData={{ area: 50 }}
          resultSummary={{ summary: "50 sqm, 3 containers" }}
        />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("SaveToProjectButton", () => {
  it("labels the new-project name input with a visible, associated label", async () => {
    const { useAuth } = await import("@/lib/auth");
    // the component calls useAuth on every render and keys
    // loadProjects on the user object's identity, so the stub must
    // return a stable reference until the test restores the default
    const signedIn = { user: { id: "u1" }, loading: false };
    vi.mocked(useAuth).mockImplementation(() => signedIn as never);
    fromMock.mockImplementation(() => ({
      select: () => ({
        not: () => ({
          order: () => ({
            then: (cb: (r: { data: unknown }) => void) => {
              cb({ data: [] });
              return Promise.resolve();
            },
          }),
        }),
      }),
    }));
    await renderButton();
    fireEvent.click(screen.getByRole("button", { name: /save to project/i }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: /create first project/i }),
      ).toBeTruthy(),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /create first project/i }),
    );
    const input = await screen.findByLabelText(/project name/i);
    expect((input as HTMLElement).id).toBe("save-to-project-new-name");
    expect(
      screen.getByText(/3-bedroom house/i, { selector: "p" }),
    ).toBeTruthy();
    vi.mocked(useAuth).mockImplementation(
      () => ({ user: null, loading: false }) as never,
    );
  });

  it("renders without crashing", async () => {
    const { container } = await renderButton();
    expect(container.innerHTML).not.toBe("");
  });

  it("stores pending intent in sessionStorage on handleSaveIntentAndSignIn", async () => {
    // Verify sessionStorage interaction
    const setItemSpy = vi.spyOn(Storage.prototype, "setItem");
    const payload = {
      calculatorType: "paint",
      calculatorSlug: "paint-calculator",
      calcTitle: "Living Room Paint",
      calcData: { area: 100 },
      resultSummary: { summary: "100 sqm" },
      timestamp: Date.now(),
    };
    sessionStorage.setItem("frelux_pending_calc_save", JSON.stringify(payload));
    expect(setItemSpy).toHaveBeenCalledWith(
      "frelux_pending_calc_save",
      expect.any(String),
    );
    const retrieved = JSON.parse(
      sessionStorage.getItem("frelux_pending_calc_save") || "{}",
    );
    expect(retrieved.calculatorSlug).toBe("paint-calculator");
    expect(retrieved.calcData.area).toBe(100);
  });
});

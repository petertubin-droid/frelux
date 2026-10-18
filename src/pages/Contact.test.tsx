import { describe, it, expect, vi, beforeEach } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

vi.mock("@/lib/auth", () => ({ useAuth: vi.fn(() => ({ user: null, loading: false })) }));
vi.mock("@/lib/credits", () => ({ getCreditWallet: vi.fn().mockResolvedValue(null), getActivityStreak: vi.fn().mockResolvedValue(null), recordActivity: vi.fn().mockResolvedValue(true), REWARD_EVENTS: {} }));

beforeEach(() => { vi.clearAllMocks(); });

async function renderPage() {
  const Comp = (await import("@/pages/Contact")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("Contact", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("renders verified WhatsApp and Email support options", async () => {
    const { getByText, getAllByText } = await renderPage();
    expect(getByText("WhatsApp Support")).toBeTruthy();
    expect(getByText("+234 906 361 2439")).toBeTruthy();
    expect(getAllByText("frenzyanthony39@gmail.com").length).toBeGreaterThan(0);
    expect(getByText(/Monday – Friday/i)).toBeTruthy();
  });
});

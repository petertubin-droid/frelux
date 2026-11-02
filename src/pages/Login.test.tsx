import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
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
  const Comp = (await import("@/pages/Login")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("Login", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("toggles password visibility with the eye control", async () => {
    await renderPage();
    const pwd = screen.getByPlaceholderText("Enter your password");
    expect(pwd.getAttribute("type")).toBe("password");
    const toggle = screen.getByLabelText("Show password");
    fireEvent.click(toggle);
    expect(pwd.getAttribute("type")).toBe("text");
    expect(screen.getByLabelText("Hide password")).toBeTruthy();
  });

  it("marks the remember me box when clicked", async () => {
    await renderPage();
    const box = screen.getByRole("checkbox", { name: /remember me/i });
    expect(box.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(box);
    expect(box.getAttribute("aria-checked")).toBe("true");
  });
});

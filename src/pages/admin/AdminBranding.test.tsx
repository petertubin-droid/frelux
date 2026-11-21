import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";
import AdminBranding from "./AdminBranding";

const mockBranding = {
  id: "brand-1",
  website_name: "FRELUX",
  website_tagline: "Construction intelligence",
  browser_title: "FRELUX | Construction intelligence",
  light_logo_url: null,
  dark_logo_url: null,
  favicon_url: null,
  pwa_icon_url: null,
  primary_color: "#7C3AED",
  secondary_color: "#0B1120",
  accent_color: "#F97316",
  hero_highlight_config: { highlights: [] },
  hero_image_url: null,
};

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({ user: { id: "admin-1", email: "admin@frelux.com" }, loading: false })),
}));

vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue(null),
  getActivityStreak: vi.fn().mockResolvedValue(null),
  recordActivity: vi.fn().mockResolvedValue(true),
  REWARD_EVENTS: {},
}));

const mockRefresh = vi.fn();
vi.mock("@/lib/branding", () => ({
  useBranding: () => ({
    branding: mockBranding,
    loading: false,
    refresh: mockRefresh,
  }),
}));

const mockUpdate = vi.fn().mockReturnValue({
  eq: vi.fn().mockResolvedValue({ error: null }),
});
vi.mock("@/lib/supabase", () => ({
  isSupabaseConfigured: true,
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "site_settings") {
        return {
          select: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { hero_headline: "Know Exactly What Materials Your Project Needs." },
              }),
            }),
          }),
        };
      }
      return {
        update: mockUpdate,
      };
    }),
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <AdminBranding />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("AdminBranding", () => {
  it("renders Site Identity fields populated with current branding", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByDisplayValue("FRELUX")).toBeDefined();
      expect(screen.getByDisplayValue("Construction intelligence")).toBeDefined();
      expect(screen.getByDisplayValue("FRELUX | Construction intelligence")).toBeDefined();
    });
  });

  it("updates website name when user edits the input", async () => {
    renderPage();

    const nameInput = await screen.findByDisplayValue("FRELUX");
    fireEvent.change(nameInput, { target: { value: "FRELUX Global" } });

    expect(screen.getByDisplayValue("FRELUX Global")).toBeDefined();
  });

  it("renders brand color controls and saves changes", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Brand Colors")).toBeDefined();
    });

    const saveBtn = screen.getByRole("button", { name: /Save Branding/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});

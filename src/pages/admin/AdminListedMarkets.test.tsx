import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminListedMarkets from "@/pages/admin/AdminListedMarkets";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "admin-1", email: "admin@frelux.test" },
    isAdmin: true,
    loading: false,
  })),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockImplementation((fn: string) => {
        if (fn === "market-stocks") {
          return Promise.resolve({
            data: {
              providers: [
                {
                  slug: "ngx-official",
                  label: "Nigerian Exchange Group (NGX)",
                  capabilities: ["stocks", "indices"],
                  has_key: true,
                  update_frequency_minutes: 60,
                },
              ],
            },
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
    },
    from: vi.fn().mockImplementation((table: string) => {
      let data: unknown[] = [];
      if (table === "mi_companies") {
        data = [
          {
            symbol: "DANGCEM",
            name: "Dangote Cement Plc",
            sector: "Building Materials",
            country_code: "NG",
            is_active: true,
          },
          {
            symbol: "BUACEMENT",
            name: "BUA Cement Plc",
            sector: "Building Materials",
            country_code: "NG",
            is_active: true,
          },
        ];
      } else if (table === "mi_market_news") {
        data = [
          {
            id: "news-1",
            headline: "Cement manufacturers report Q3 production volumes",
            source_name: "BusinessDay Nigeria",
            category: "industry",
            published_at: "2026-11-18T10:00:00Z",
            is_published: true,
          },
        ];
      } else if (table === "mi_investor_access") {
        data = [
          {
            user_id: "inv-1",
            granted_at: "2026-11-10T12:00:00Z",
            note: "Private equity construction analyst",
          },
        ];
      } else if (table === "mi_company_documents") {
        data = [];
      }
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        limit: vi.fn().mockReturnThis(),
        then: vi.fn().mockImplementation((fn) => Promise.resolve(fn({ data, error: null }))),
      };
    }),
  },
}));

describe("AdminListedMarkets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Market Intelligence control panel for administrators", async () => {
    render(
      <MemoryRouter>
        <AdminListedMarkets />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/Market Intelligence control panel/i);
    });
  });

  it("loads and displays listed construction materials companies", async () => {
    render(
      <MemoryRouter>
        <AdminListedMarkets />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText(/DANGCEM/i)).toBeDefined();
      expect(screen.getByText(/BUACEMENT/i)).toBeDefined();
    });
  });
});

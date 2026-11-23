import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminListedMarkets from "@/pages/admin/AdminListedMarkets";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/auth";

vi.mock("@/lib/auth", () => ({
  useAuth: vi.fn(() => ({
    user: { id: "admin-1", email: "admin@frelux.test" },
    isAdmin: true,
    loading: false,
  })),
}));

const {
  mockProviders,
  mockCompanies,
  mockNews,
  mockAccess,
  mockDocs,
  mockUpdateEq,
  mockUpdate,
  mockInsert,
  mockInvoke,
} = vi.hoisted(() => {
  const mockUpdateEq = vi.fn().mockResolvedValue({ error: null });
  const mockUpdate = vi.fn(() => ({ eq: mockUpdateEq }));
  const mockInsert = vi.fn().mockResolvedValue({ error: null });
  const mockInvoke = vi.fn();
  return {
    mockUpdateEq,
    mockUpdate,
    mockInsert,
    mockInvoke,
    mockProviders: {
      providers: [
        {
          slug: "ng-ngx",
          label: "Nigerian Exchange Group",
          capabilities: ["stocks", "indices"],
          has_key: true,
          key_env_var: "NGX_API_KEY",
          update_frequency_minutes: 15,
          last_error: null,
          last_ok_at: "2026-11-23T12:00:00Z",
        },
      ],
    },
    mockCompanies: [
      {
        symbol: "DANGCEM",
        name: "Dangote Cement Plc",
        sector: "Industrial Goods",
        country_code: "NG",
        is_active: true,
      },
      {
        symbol: "BUACEMENT",
        name: "BUA Cement Plc",
        sector: "Industrial Goods",
        country_code: "NG",
        is_active: false,
      },
    ],
    mockNews: [
      {
        id: "news-1",
        headline: "Cement sector Q3 earnings surge across West Africa",
        source_name: "BusinessDay",
        category: "construction",
        published_at: "2026-11-22T08:00:00Z",
        is_published: true,
      },
    ],
    mockAccess: [
      {
        user_id: "user-inv-12345678",
        granted_at: "2026-11-15T10:00:00Z",
        note: "VIP partner",
      },
    ],
    mockDocs: [
      {
        id: "doc-1",
        title: "Q3 2026 Infrastructure Report",
        doc_type: "pdf",
        created_at: "2026-11-10T00:00:00Z",
      },
    ],
  };
});

function makeChain(table: string) {
  if (table === "mi_companies") {
    return {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockCompanies, error: null }),
      update: mockUpdate,
    };
  }
  if (table === "mi_market_news") {
    return {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockNews, error: null }),
      update: mockUpdate,
    };
  }
  if (table === "mi_investor_access") {
    return {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockAccess, error: null }),
      insert: mockInsert,
    };
  }
  if (table === "mi_investor_documents") {
    return {
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({ data: mockDocs, error: null }),
    };
  }
  if (table === "mi_provider_config") {
    return {
      update: mockUpdate,
    };
  }
  if (table === "profiles") {
    return {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "profile-target-1", email: "partner@example.com" },
        error: null,
      }),
    };
  }
  return {
    select: vi.fn().mockReturnThis(),
  };
}

vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: (...args: any[]) => mockInvoke(...args),
    },
    from: vi.fn((table: string) => makeChain(table)),
  },
}));

describe("AdminListedMarkets", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUpdateEq.mockResolvedValue({ error: null });
    mockInsert.mockResolvedValue({ error: null });
    mockInvoke.mockResolvedValue({ data: mockProviders, error: null });
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "admin-1", email: "admin@frelux.test" } as any,
      isAdmin: true,
      loading: false,
    });
    vi.mocked(supabase.from).mockImplementation(
      (table: string) => makeChain(table) as any,
    );
  });

  it("denies access to non-administrators", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "regular-user", email: "user@frelux.test" } as any,
      isAdmin: false,
      loading: false,
    });

    render(
      <MemoryRouter>
        <AdminListedMarkets />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /Administrators/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Sign in with an administrator account to manage market intelligence/,
      ),
    ).toBeInTheDocument();
  });

  it("renders market intelligence control panel and active providers, companies and news", async () => {
    render(
      <MemoryRouter>
        <AdminListedMarkets />
      </MemoryRouter>,
    );

    expect(
      screen.getByRole("heading", { name: /Market/i }),
    ).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("Nigerian Exchange Group")).toBeInTheDocument();
      expect(screen.getByText("stocks, indices")).toBeInTheDocument();
      expect(screen.getByText("configured")).toBeInTheDocument();
      expect(
        screen.getByText("DANGCEM · Industrial Goods"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("BUACEMENT · Industrial Goods"),
      ).toBeInTheDocument();
      expect(
        screen.getByText("Cement sector Q3 earnings surge across West Africa"),
      ).toBeInTheDocument();
    });
  });

  it("updates provider refresh frequency on input blur", async () => {
    render(
      <MemoryRouter>
        <AdminListedMarkets />
      </MemoryRouter>,
    );

    await screen.findByText("Nigerian Exchange Group");
    const refreshInput = screen.getByLabelText(
      "Refresh minutes for Nigerian Exchange Group",
    );
    fireEvent.change(refreshInput, { target: { value: "30" } });
    fireEvent.blur(refreshInput);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ update_frequency_minutes: 30 });
      expect(mockUpdateEq).toHaveBeenCalledWith("slug", "ng-ngx");
      expect(
        screen.getByText("Update frequency for ng-ngx saved."),
      ).toBeInTheDocument();
    });
  });

  it("toggles company active status", async () => {
    render(
      <MemoryRouter>
        <AdminListedMarkets />
      </MemoryRouter>,
    );

    await screen.findByText("DANGCEM · Industrial Goods");
    const dangcemBtn = screen.getByRole("button", {
      name: "DANGCEM · Industrial Goods",
    });
    fireEvent.click(dangcemBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
      expect(mockUpdateEq).toHaveBeenCalledWith("symbol", "DANGCEM");
      expect(screen.getByText("DANGCEM hidden.")).toBeInTheDocument();
    });
  });

  it("toggles news publication status", async () => {
    render(
      <MemoryRouter>
        <AdminListedMarkets />
      </MemoryRouter>,
    );

    await screen.findByText(
      "Cement sector Q3 earnings surge across West Africa",
    );
    const unpublishBtn = screen.getByRole("button", { name: "Unpublish" });
    fireEvent.click(unpublishBtn);

    await waitFor(() => {
      expect(mockUpdate).toHaveBeenCalledWith({ is_published: false });
      expect(mockUpdateEq).toHaveBeenCalledWith("id", "news-1");
      expect(screen.getByText("Story unpublished.")).toBeInTheDocument();
    });
  });

  it("grants investor access to a registered profile", async () => {
    render(
      <MemoryRouter>
        <AdminListedMarkets />
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: /Market/i });
    const emailInput = screen.getByLabelText("investor@example.com");
    fireEvent.change(emailInput, { target: { value: "partner@example.com" } });

    const grantBtn = screen.getByRole("button", { name: "Grant access" });
    fireEvent.click(grantBtn);

    await waitFor(() => {
      expect(mockInsert).toHaveBeenCalledWith({
        user_id: "profile-target-1",
        note: "granted by admin@frelux.test",
      });
      expect(
        screen.getByText("Investor access granted to partner@example.com."),
      ).toBeInTheDocument();
    });
  });

  it("shows an error when granting investor access to an unregistered email", async () => {
    vi.mocked(supabase.from).mockImplementation((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
        } as any;
      }
      return makeChain(table) as any;
    });

    render(
      <MemoryRouter>
        <AdminListedMarkets />
      </MemoryRouter>,
    );

    await screen.findByRole("heading", { name: /Market/i });
    const emailInput = screen.getByLabelText("investor@example.com");
    fireEvent.change(emailInput, { target: { value: "unknown@example.com" } });

    const grantBtn = screen.getByRole("button", { name: "Grant access" });
    fireEvent.click(grantBtn);

    await waitFor(() => {
      expect(
        screen.getByText(
          "No FRELUX account found for unknown@example.com. The investor must register first.",
        ),
      ).toBeInTheDocument();
      expect(mockInsert).not.toHaveBeenCalled();
    });
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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

/**
 * Fake Supabase that answers the three reads this screen makes. A chainable
 * query is also thenable, so any shape of `.select().eq().order().range()` or
 * `.select().eq().maybeSingle()` resolves to the table's fixture.
 */
function queryable(result: unknown) {
  const chain: Record<string, unknown> = {};
  for (const method of [
    "select",
    "eq",
    "neq",
    "in",
    "or",
    "order",
    "range",
    "limit",
    "update",
    "insert",
    "upsert",
    "delete",
  ]) {
    chain[method] = () => chain;
  }
  chain.maybeSingle = () => Promise.resolve(result);
  chain.single = () => Promise.resolve(result);
  chain.then = (resolve: (value: unknown) => unknown) => resolve(result);
  return chain;
}

const state = vi.hoisted(() => ({
  profiles: [] as Record<string, unknown>[],
  proProfile: null as Record<string, unknown> | null,
  invoke: null as null | ((...args: unknown[]) => Promise<unknown>),
  functionMessage: "Edge Function returned a non-2xx status code",
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    from: (table: string) => {
      if (table === "pro_profiles")
        return queryable({ data: state.proProfile, error: null });
      if (table === "user_paid_status")
        return queryable({ data: [], error: null });
      return queryable({
        data: state.profiles,
        error: null,
        count: state.profiles.length,
      });
    },
    functions: {
      invoke: (...args: unknown[]) =>
        state.invoke
          ? state.invoke(...args)
          : Promise.resolve({ data: { ok: true }, error: null }),
    },
  },
  getFunctionErrorMessage: async () => state.functionMessage,
}));

const PRO_USER = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "ada@builders.example",
  full_name: "Ada Obi",
  phone: "+2348000000000",
  account_type: "pro_worker",
  account_state: "active",
  role: "user",
  created_at: "2026-01-02T10:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
  state.profiles = [PRO_USER];
  state.proProfile = null;
  state.invoke = null;
  state.functionMessage = "Edge Function returned a non-2xx status code";
});

async function renderPage() {
  const Comp = (await import("@/pages/admin/AdminUsers")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("AdminUsers", () => {
  it("renders without crashing", async () => {
    const { container } = await renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("opens the editor on the professional's real record, not blanks", async () => {
    // Saving the editor writes every field it shows, so a blank form would
    // unlist a listed professional and wipe their details.
    state.proProfile = {
      display_name: "Ada Obi Builders",
      business_name: "Ada Obi Builders Ltd",
      years_experience: 7,
      availability: "busy",
      is_listed: true,
    };
    await renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /edit user/i }));

    const listed = await screen.findByRole("checkbox", {
      name: /list this professional in the directory/i,
    });
    await waitFor(() => expect(listed).toBeChecked());
    expect(screen.getByDisplayValue("Ada Obi Builders Ltd")).toBeDefined();
    expect(screen.getByDisplayValue("7")).toBeDefined();
  });

  it("shows the reason the edge function rejected the save", async () => {
    state.invoke = async () => ({
      data: null,
      error: new Error("Edge Function returned a non-2xx status code"),
    });
    state.functionMessage = "This account has no professional profile";
    await renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /edit user/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: /save changes/i }),
    );

    const message = await screen.findByText(
      /this account has no professional profile/i,
    );
    expect(message).toBeDefined();
  });

  it("assigns a professional in one save when the form is submitted", async () => {
    const calls: unknown[] = [];
    state.invoke = async (...args: unknown[]) => {
      calls.push(args);
      return { data: { ok: true }, error: null };
    };
    await renderPage();

    fireEvent.click(await screen.findByRole("button", { name: /edit user/i }));
    fireEvent.click(
      await screen.findByRole("button", { name: /save changes/i }),
    );

    await waitFor(() => expect(calls.length).toBe(1));
    const body = (calls[0] as [string, { body: Record<string, unknown> }])[1]
      .body;
    expect(body.action).toBe("update");
    expect(body.account_type).toBe("pro_worker");
    expect(body.pro).toBeTruthy();
  });
});

describe("AdminUsers Location and Identity Document Display", () => {
  it("displays user location and Nigerian NIN badge in the table", async () => {
    state.profiles = [
      {
        ...PRO_USER,
        id: "22222222-2222-4222-8222-222222222222",
        full_name: "Babajide Sanwo",
        email: "babajide@lagos.example",
        phone: "+2348011223344",
        country_code: "NG",
        location: "Ikeja, Lagos State",
        nin_number: "98765432101",
      },
    ];
    await renderPage();

    expect(await screen.findByText("Ikeja, Lagos State")).toBeInTheDocument();
    expect(screen.getByText(/NIN: 98765432101/i)).toBeInTheDocument();
    expect(screen.getByText(/Nigeria \(NIMC\)/i)).toBeInTheDocument();
  });

  it("displays international government ID badge for non-Nigerian users", async () => {
    state.profiles = [
      {
        ...PRO_USER,
        id: "33333333-3333-4333-8333-333333333333",
        full_name: "Sarah Jenkins",
        email: "sarah@austin.example",
        phone: "+15125550199",
        country_code: "US",
        location: "Austin, Texas",
        government_id_type: "drivers_license",
        government_id_number: "TX-DL-98213",
      },
    ];
    await renderPage();

    expect(await screen.findByText("Austin, Texas")).toBeInTheDocument();
    expect(
      screen.getByText(/DRIVERS LICENSE: TX-DL-98213/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/International ID/i)).toBeInTheDocument();
  });
});

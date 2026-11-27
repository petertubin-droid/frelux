import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import ProConnectMessageModal from "./ProConnectMessageModal";
import type { DbProProfile } from "@/types/pro-connect";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

let mockUser: { id: string; email: string } | null = null;
vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: mockUser, loading: false }),
}));

vi.mock("@/lib/credits", () => ({
  getCreditWallet: vi.fn().mockResolvedValue({ balance: 25 }),
}));

const mockGetOrCreateConversation = vi.fn();
const mockSendMessage = vi.fn();
vi.mock("@/lib/pro-connect", () => ({
  getOrCreateConversation: (...args: unknown[]) => mockGetOrCreateConversation(...args),
  sendMessage: (...args: unknown[]) => mockSendMessage(...args),
}));

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  },
  isSupabaseConfigured: true,
}));

const sampleProfile: DbProProfile = {
  id: "pro-123",
  user_id: "user-worker-456",
  category_id: "cat-1",
  business_name: "Apex Engineering",
  display_name: "Engr. David Okon",
  slug: "engr-david-okon",
  country: "NG",
  service_area_text: "Lagos, Abuja",
  bio: "Structural and civil engineer with 12 years of high-rise experience.",
  profile_image_url: "https://example.com/david.jpg",
  cover_image_url: null,
  years_experience: 12,
  availability: "available",
  verification_status: "verified",
  is_profile_complete: true,
  is_listed: true,
  contact_email_public: false,
  contact_phone_public: true,
  website_url: null,
  rating_avg: 4.9,
  rating_count: 24,
  project_count: 18,
  sort_order: 1,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
  contact_verified_at: "2026-01-02T00:00:00Z",
  identity_verified_at: "2026-01-02T00:00:00Z",
  pro_level: true,
  pro_level_awarded_at: null,
  phone_verified: true,
  nin_verified: true,
  mobile_otp_verified: true,
  seo_title: null,
  seo_description: null,
  seo_indexable: true,
};

describe("ProConnectMessageModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = null;
  });

  it("prompts unauthenticated visitors to sign in", () => {
    mockUser = null;
    render(
      <MemoryRouter>
        <ProConnectMessageModal
          isOpen={true}
          onClose={vi.fn()}
          profile={sampleProfile}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Sign in to message this professional")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Sign In or Register/i })).toBeInTheDocument();
  });

  it("warns when viewing own professional profile", () => {
    mockUser = { id: "user-worker-456", email: "david@example.com" };
    render(
      <MemoryRouter>
        <ProConnectMessageModal
          isOpen={true}
          onClose={vi.fn()}
          profile={sampleProfile}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("This is your profile")).toBeInTheDocument();
    expect(
      screen.getByText(/You are viewing your own professional profile/i),
    ).toBeInTheDocument();
  });

  it("renders composer with profile details and credit balance for logged in customer", async () => {
    mockUser = { id: "cust-999", email: "customer@example.com" };
    render(
      <MemoryRouter>
        <ProConnectMessageModal
          isOpen={true}
          onClose={vi.fn()}
          profile={sampleProfile}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText("Engr. David Okon")).toBeInTheDocument();
    expect(screen.getByText("Verified")).toBeInTheDocument();
    expect(screen.getByText(/Sending costs 5 FRELUX Credits/i)).toBeInTheDocument();
    await waitFor(() => {
      expect(screen.getByText("25")).toBeInTheDocument();
    });
  });

  it("fills inquiry template when clicking preset button", async () => {
    mockUser = { id: "cust-999", email: "customer@example.com" };
    render(
      <MemoryRouter>
        <ProConnectMessageModal
          isOpen={true}
          onClose={vi.fn()}
          profile={sampleProfile}
        />
      </MemoryRouter>,
    );

    const quoteBtn = screen.getByRole("button", { name: "Quotation Request" });
    fireEvent.click(quoteBtn);

    const textarea = screen.getByPlaceholderText(/Provide project details/i);
    expect(textarea).toHaveValue(
      "Hello Engr. David Okon (Apex Engineering), I am requesting a detailed quotation for an upcoming construction project. Please let me know your availability to discuss scope and specifications.",
    );
  });

  it("displays delivery success screen after successful send", async () => {
    mockUser = { id: "cust-999", email: "customer@example.com" };
    mockGetOrCreateConversation.mockResolvedValue({ id: "convo-test-abc" });
    mockSendMessage.mockResolvedValue({
      id: "msg-123",
      body: "We need an engineer for a commercial site.",
      conversation_id: "convo-test-abc",
      sender_id: "cust-999",
      created_at: new Date().toISOString(),
    });

    render(
      <MemoryRouter>
        <ProConnectMessageModal
          isOpen={true}
          onClose={vi.fn()}
          profile={sampleProfile}
        />
      </MemoryRouter>,
    );

    const textarea = screen.getByPlaceholderText(/Provide project details/i);
    fireEvent.change(textarea, { target: { value: "We need an engineer for a commercial site." } });

    const sendBtn = screen.getByRole("button", { name: /Send Message/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByText("Message Delivered!")).toBeInTheDocument();
    });
    expect(screen.getByText(/Your message was sent to/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Open Chat Thread/i })).toBeInTheDocument();
  });

  it("displays credit error with alert role when balance is insufficient", async () => {
    mockUser = { id: "cust-999", email: "customer@example.com" };
    mockGetOrCreateConversation.mockResolvedValue({ id: "convo-test-abc" });
    mockSendMessage.mockResolvedValue({
      error: "Not enough FRELUX Credits. Sending costs 5 credits; you have 2.",
      code: "INSUFFICIENT_CREDITS",
    });

    render(
      <MemoryRouter>
        <ProConnectMessageModal
          isOpen={true}
          onClose={vi.fn()}
          profile={sampleProfile}
        />
      </MemoryRouter>,
    );

    const textarea = screen.getByPlaceholderText(/Provide project details/i);
    fireEvent.change(textarea, { target: { value: "Hello, checking rates." } });

    const sendBtn = screen.getByRole("button", { name: /Send Message/i });
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Not enough FRELUX Credits");
    });
    expect(screen.getByText("Top up credits in wallet")).toBeInTheDocument();
  });
});

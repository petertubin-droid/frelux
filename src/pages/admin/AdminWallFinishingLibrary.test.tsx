import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import AdminWallFinishingLibrary from "@/pages/admin/AdminWallFinishingLibrary";

vi.mock("@/lib/i18n", () => ({
  useLanguage: () => ({
    t: (s: string) => s,
    language: "en",
  }),
}));

const mockFrom = vi.fn();
vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: { id: "admin-1", email: "admin@frelux.test" } },
      }),
    },
    from: (...args: any[]) => mockFrom(...args),
  },
}));

const initialTopics = [
  {
    id: "top-1",
    market_code: "NG",
    candidate_key: "exterior_stucco_tropical",
    title: "Exterior Stucco Application in Tropical Humid Climates",
    topic_type: "technique",
    verification_status: "candidate",
  },
];

const initialSources = [
  {
    id: "src-1",
    topic_id: "top-1",
    title: "Nigerian Building and Road Research Institute Standards",
    url: "https://nbrri.gov.ng",
    publisher: "NBRRI",
    claim_scope: "national standards for external render",
    review_status: "pending",
  },
];

const initialSlots = [
  {
    topic_id: "top-1",
    market_code: "NG",
    theme_key: "overview",
    language_code: "en",
    article_id: null,
  },
];

describe("AdminWallFinishingLibrary", () => {
  let updateTopicMock: any;
  let updateSourceMock: any;
  let insertSourceMock: any;
  let insertArticleMock: any;
  let updateSlotMock: any;

  beforeEach(() => {
    vi.clearAllMocks();

    updateTopicMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    updateSourceMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) });
    insertSourceMock = vi.fn().mockResolvedValue({ error: null });
    insertArticleMock = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({ data: { id: "art-new-1" }, error: null }),
      }),
    });
    updateSlotMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      }),
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "learn_wall_finishing_topics") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: initialTopics, error: null }),
            }),
          }),
          update: updateTopicMock,
        };
      }
      if (table === "learn_wall_finishing_sources") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({ data: initialSources, error: null }),
          }),
          insert: insertSourceMock,
          update: updateSourceMock,
        };
      }
      if (table === "learn_wall_finishing_article_slots") {
        return {
          select: vi.fn().mockResolvedValue({ data: initialSlots, error: null }),
          update: updateSlotMock,
        };
      }
      if (table === "learn_articles") {
        return {
          select: vi.fn().mockReturnValue({
            not: vi.fn().mockResolvedValue({ data: [], error: null }),
          }),
          insert: insertArticleMock,
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        };
      }
      if (table === "learn_categories") {
        return {
          select: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [{ slug: "wall-finishing", name: "Wall Finishing" }],
              error: null,
            }),
          }),
        };
      }
      if (table === "learn_wall_finishing_market_status") {
        return {
          select: vi.fn().mockResolvedValue({
            data: [
              {
                market_code: "NG",
                has_native_catalog: true,
                coverage_status: "complete",
              },
            ],
            error: null,
          }),
        };
      }
      return {
        select: vi.fn().mockReturnThis(),
        order: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        then: (fn: any) => Promise.resolve(fn({ data: [], error: null })),
      };
    });
  });

  it("renders the Wall Finishing Knowledge Library console and metrics", async () => {
    render(
      <MemoryRouter>
        <AdminWallFinishingLibrary />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Wall Finishing Knowledge Library" }),
      ).toBeInTheDocument();
      expect(screen.getByText("Candidate topics")).toBeInTheDocument();
      expect(screen.getByText("Market evidence coverage")).toBeInTheDocument();
      expect(
        screen.getByText(/Exterior Stucco Application in Tropical Humid Climates/i),
      ).toBeInTheDocument();
    });
  });

  it("updates topic verification status", async () => {
    render(
      <MemoryRouter>
        <AdminWallFinishingLibrary />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue("Candidate")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByDisplayValue("Candidate"), {
      target: { value: "verified" },
    });

    await waitFor(() => {
      expect(updateTopicMock).toHaveBeenCalledWith({ verification_status: "verified" });
    });
  });

  it("adds a new source citation with required credentials", async () => {
    render(
      <MemoryRouter>
        <AdminWallFinishingLibrary />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", { name: "Save pending citation" }),
      ).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Source title"), {
      target: { value: "Standard Organization of Nigeria NIS 444" },
    });
    fireEvent.change(screen.getByLabelText("Source URL"), {
      target: { value: "https://son.gov.ng/nis-444" },
    });
    fireEvent.change(screen.getByLabelText("Publisher"), {
      target: { value: "SON Nigeria" },
    });
    fireEvent.change(screen.getByLabelText("Claims this source supports"), {
      target: { value: "Sandcrete plaster and screed thickness tolerance" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save pending citation" }));

    await waitFor(() => {
      expect(insertSourceMock).toHaveBeenCalledWith(
        expect.objectContaining({
          topic_id: "top-1",
          title: "Standard Organization of Nigeria NIS 444",
          url: "https://son.gov.ng/nis-444",
          publisher: "SON Nigeria",
          claim_scope: "Sandcrete plaster and screed thickness tolerance",
          created_by: "admin-1",
        }),
      );
    });
  });

  it("reviews and accepts a citation", async () => {
    render(
      <MemoryRouter>
        <AdminWallFinishingLibrary />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Accept citation: Nigerian Building and Road Research Institute Standards",
        }),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Accept citation: Nigerian Building and Road Research Institute Standards",
      }),
    );

    await waitFor(() => {
      expect(updateSourceMock).toHaveBeenCalledWith({ review_status: "accepted" });
    });
  });

  it("reviews and rejects a citation", async () => {
    render(
      <MemoryRouter>
        <AdminWallFinishingLibrary />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(
        screen.getByRole("button", {
          name: "Reject citation: Nigerian Building and Road Research Institute Standards",
        }),
      ).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", {
        name: "Reject citation: Nigerian Building and Road Research Institute Standards",
      }),
    );

    await waitFor(() => {
      expect(updateSourceMock).toHaveBeenCalledWith({ review_status: "rejected" });
    });
  });

  it("saves a new market article draft linked to topic and slot", async () => {
    render(
      <MemoryRouter>
        <AdminWallFinishingLibrary />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Save draft" })).toBeInTheDocument();
    });

    fireEvent.change(screen.getByLabelText("Title"), {
      target: { value: "Tropical Exterior Stucco Guide" },
    });
    fireEvent.change(screen.getByLabelText("URL slug"), {
      target: { value: "tropical-exterior-stucco-guide" },
    });
    fireEvent.change(screen.getByLabelText("Excerpt"), {
      target: { value: "Best practices for humid coastal exterior rendering." },
    });
    fireEvent.change(screen.getByLabelText("Article content"), {
      target: { value: "Full specification text for sandcrete rendering." },
    });

    fireEvent.click(screen.getByRole("button", { name: "Save draft" }));

    await waitFor(() => {
      expect(insertArticleMock).toHaveBeenCalledWith(
        expect.objectContaining({
          slug: "tropical-exterior-stucco-guide",
          title: "Tropical Exterior Stucco Guide",
          category_slug: "wall-finishing",
          status: "draft",
          wall_topic_id: "top-1",
        }),
      );
      expect(updateSlotMock).toHaveBeenCalledWith({ article_id: "art-new-1" });
    });
  });

  it("surfaces error banner when queries fail to load", async () => {
    mockFrom.mockImplementationOnce(() => ({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: null,
            error: { message: "Database connection failed" },
          }),
        }),
      }),
    }));

    render(
      <MemoryRouter>
        <AdminWallFinishingLibrary />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent("Database connection failed");
    });
  });
});

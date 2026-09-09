import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("@/lib/supabase", () => ({
  supabase: {
    auth: {
      getUser: async () => ({ data: { user: { id: "owner-1" } } }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () =>
            Promise.resolve({ data: { role: "admin" }, error: null }),
        }),
      }),
    }),
  },
}));

const fetchMyContributor = vi.fn();
const fetchArchieDomains = vi.fn();
const fetchIngestions = vi.fn();
const createArchieIngestion = vi.fn();
const uploadTrainingMedia = vi.fn();
const approveIngestionCandidates = vi.fn();
const rejectIngestion = vi.fn();

vi.mock("@/lib/archie/archie-client", () => ({
  fetchMyContributor: (...a: unknown[]) => fetchMyContributor(...a),
  fetchArchieDomains: (...a: unknown[]) => fetchArchieDomains(...a),
  fetchIngestions: (...a: unknown[]) => fetchIngestions(...a),
  createArchieIngestion: (...a: unknown[]) => createArchieIngestion(...a),
  uploadTrainingMedia: (...a: unknown[]) => uploadTrainingMedia(...a),
  approveIngestionCandidates: (...a: unknown[]) =>
    approveIngestionCandidates(...a),
  rejectIngestion: (...a: unknown[]) => rejectIngestion(...a),
}));

import ArchieTraining from "@/pages/archie/ArchieTraining";

beforeEach(() => {
  vi.clearAllMocks();
  fetchMyContributor.mockResolvedValue({
    user_id: "owner-1",
    display_name: "Owner",
    role: "ARCHIE_ADMIN",
    allowed_domains: [],
    must_review: true,
    active: true,
  });
  fetchArchieDomains.mockResolvedValue([]);
  fetchIngestions.mockResolvedValue([]);
  createArchieIngestion.mockResolvedValue({ ok: false, error: "gated" });
  uploadTrainingMedia.mockResolvedValue({ ok: true, mediaUri: "m://1" });
  approveIngestionCandidates.mockResolvedValue({ ok: true });
  rejectIngestion.mockResolvedValue({ ok: true });
});

function renderPage() {
  return render(<ArchieTraining />);
}

describe("ArchieTraining", () => {
  it("renders the Training console once the Owner is authenticated", async () => {
    renderPage();
    expect(await screen.findByText("Training")).toBeTruthy();
  });

  it("mounts without crashing while ingestions are unresolved", () => {
    fetchIngestions.mockReturnValue(new Promise(() => []));
    const { container } = renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});

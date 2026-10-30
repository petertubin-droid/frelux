import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const storeMock = vi.hoisted(() => ({
  fetchStatusOverlay: vi.fn(),
  fetchStatusHistory: vi.fn(),
  saveStatusChange: vi.fn(),
}));

vi.mock("@/lib/codes/status-store", () => storeMock);

import CodeReference from "./CodeReference";

function renderPage() {
  return render(
    <MemoryRouter>
      <CodeReference />
    </MemoryRouter>,
  );
}

describe("CodeReference page", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    storeMock.fetchStatusOverlay.mockResolvedValue({
      overlay: {},
      rows: [],
      error: null,
    });
  });

  it("defaults to Nigeria's adopted code and reports snow as not codified", () => {
    renderPage();
    expect(
      screen.getByRole("heading", {
        name: /international building code reference/i,
      }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("National Building Code (Nigeria)"),
    ).toBeInTheDocument();
    // Snow domain card must state the gap explicitly.
    const snowCard = screen
      .getByRole("heading", { name: "Snow loads" })
      .closest("article")!;
    expect(within(snowCard).getByText(/not codified/i)).toBeInTheDocument();
    expect(
      within(snowCard).getByText(/not a codified design case/i),
    ).toBeInTheDocument();
  });

  it("switches family and edition when the country changes", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/project country/i), {
      target: { value: "US" },
    });
    expect(
      screen.getAllByText(/International Building Code/).length,
    ).toBeGreaterThan(0);
    const edition = screen.getByLabelText(/code edition/i) as HTMLSelectElement;
    expect(edition.value).toBe("ibc-2021");
    // US snow IS codified: the domain must carry references, not a gap.
    const snowCard = screen
      .getByRole("heading", { name: "Snow loads" })
      .closest("article")!;
    expect(within(snowCard).getByText(/ASCE 7 Chapter 7/)).toBeInTheDocument();
  });

  it("warns when the IRC is used outside its one- and two-family scope", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/project country/i), {
      target: { value: "US" },
    });
    fireEvent.change(screen.getByLabelText(/applicable code family/i), {
      target: { value: "irc" },
    });
    fireEvent.change(screen.getByLabelText(/building type/i), {
      target: { value: "commercial" },
    });
    expect(
      screen.getByText(/limited to detached one- and two-family/i),
    ).toBeInTheDocument();
  });

  it("flags a non-adopted code family instead of applying it", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/applicable code family/i), {
      target: { value: "ibc" },
    });
    expect(screen.getByText(/not the adopted code here/i)).toBeInTheDocument();
    expect(
      screen.getByText(/not the code adopted in this jurisdiction/i),
    ).toBeInTheDocument();
  });

  it("carries the professional review and no-approval statements", () => {
    renderPage();
    expect(
      screen.getByRole("heading", { name: /professional review is required/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /does not grant, imply or guarantee municipal approval/i,
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/no other country's reference has been substituted/i),
    ).toBeInTheDocument();
  });

  it("records the location and materials in the stated assumptions", () => {
    renderPage();
    fireEvent.change(screen.getByLabelText(/project location/i), {
      target: { value: "Lekki, Lagos" },
    });
    fireEvent.change(screen.getByLabelText(/material specifications/i), {
      target: { value: "CEM II 42.5N, Grade 500 rebar" },
    });
    expect(
      screen.getByText(/Location supplied by the user: Lekki, Lagos/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/CEM II 42.5N, Grade 500 rebar/i),
    ).toBeInTheDocument();
  });

  it("shows administrative caveats from the status overlay", async () => {
    storeMock.fetchStatusOverlay.mockResolvedValue({
      overlay: {
        "ng-nbc:wind:NBC 2006 wind provisions + engineer's justification": {
          status: "verified",
          note: "Confirmed with Lagos State planning on 2026-10-30.",
          reviewer: "Eng. Test",
        },
      },
      rows: [],
      error: null,
    });
    renderPage();
    expect(
      await screen.findByText(/Confirmed with Lagos State planning/i),
    ).toBeInTheDocument();
  });

  it("keeps quiet when the overlay cannot load", async () => {
    storeMock.fetchStatusOverlay.mockResolvedValue({
      overlay: {},
      rows: [],
      error: "network down",
    });
    renderPage();
    // Library defaults still render; no error banner is shown to visitors.
    expect(
      screen.getByText("National Building Code (Nigeria)"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/network down/i)).not.toBeInTheDocument();
  });
});

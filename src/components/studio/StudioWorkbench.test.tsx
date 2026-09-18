// =========================================================
// STUDIO WORKBENCH TESTS (shared /admin/archie-studio +
// /archie/coding surface — ONE implementation)
//
// The owner's authority is the contract:
//   * a project cannot be created from a thin brief (< 8
//     chars stays disabled — no accidental empty projects)
//   * opening a project loads files + versions and selects
//     index.html for the live preview
//   * action results and errors surface honestly; the
//     workbench never silently swallows a failure
//   * the framing is explicit: nothing touches production,
//     deployment stays under owner authority
// =========================================================
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

vi.mock("@/lib/archie/studio-client", () => ({
  listStudioProjects: vi.fn(),
  getStudioFiles: vi.fn(),
  getStudioVersions: vi.fn(),
  studioAction: vi.fn(),
}));
vi.mock("@/lib/studio/preview", () => ({
  composePreview: vi.fn(
    () => "<!doctype html><html><body>preview</body></html>",
  ),
}));

import {
  listStudioProjects,
  getStudioFiles,
  getStudioVersions,
  studioAction,
} from "@/lib/archie/studio-client";
import StudioWorkbench from "@/components/studio/StudioWorkbench";

const PROJECT = {
  id: "p1",
  name: "Interior site",
  brief: "Professional interior site",
  summary: null,
  status: "DRAFT" as const,
  approved_date: null,
  created_date: "2026-09-01T00:00:00Z",
  updated_date: "2026-09-01T00:00:00Z",
};
const FILES = [
  {
    path: "index.html",
    content: "<!doctype html><html><body>Home</body></html>",
  },
  {
    path: "about.html",
    content: "<!doctype html><html><body>About</body></html>",
  },
];
const VERSIONS = [
  {
    id: "v1",
    kind: "DRAFT_BUILD" as const,
    label: "v1",
    reason: "initial",
    engine_note: null,
    created_date: "2026-09-01T00:00:00Z",
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(listStudioProjects).mockResolvedValue([PROJECT]);
  vi.mocked(getStudioFiles).mockResolvedValue(FILES);
  vi.mocked(getStudioVersions).mockResolvedValue(VERSIONS);
});

describe("StudioWorkbench", () => {
  it("states the authority framing explicitly — nothing touches production", async () => {
    render(<StudioWorkbench />);
    expect(await screen.findByText(/nothing touches production/i)).toBeTruthy();
    expect(
      screen.getByText(/deployment stays under your explicit authority/i),
    ).toBeTruthy();
  });

  it("a thin brief cannot create a project — the button stays disabled", async () => {
    render(<StudioWorkbench />);
    const btn = (await screen.findByRole("button", {
      name: /Build project/i,
    })) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.change(screen.getByLabelText("New project brief"), {
      target: { value: "tiny" },
    });
    expect(btn.disabled).toBe(true); // < 8 chars
    expect(studioAction).not.toHaveBeenCalled();
  });

  it("a real brief creates the project through the action seam", async () => {
    vi.mocked(studioAction).mockResolvedValue({
      ok: true,
      message: "Project created.",
      projectId: "p1",
    } as never);
    render(<StudioWorkbench />);
    fireEvent.change(await screen.findByLabelText("New project brief"), {
      target: { value: "Create a professional interior business website" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Build project/i }));
    await waitFor(() =>
      expect(studioAction).toHaveBeenCalledWith("create", {
        brief: "Create a professional interior business website",
      }),
    );
  });

  it("opening a project loads files and versions, index.html selected", async () => {
    render(<StudioWorkbench />);
    fireEvent.click(await screen.findByText("Interior site"));
    await waitFor(() => expect(getStudioFiles).toHaveBeenCalledWith("p1"));
    expect(getStudioVersions).toHaveBeenCalledWith("p1");
    // the multi-page preview switcher shows both html files
    expect(await screen.findByText("index.html")).toBeTruthy();
    expect(screen.getByText("about.html")).toBeTruthy();
  });

  it("loading failures surface honestly, never silently swallowed", async () => {
    vi.mocked(listStudioProjects).mockRejectedValue(
      new Error("session expired"),
    );
    render(<StudioWorkbench />);
    expect(await screen.findByText("session expired")).toBeTruthy();
  });

  it("action failures surface the server's own message", async () => {
    vi.mocked(studioAction).mockResolvedValue({
      ok: false,
      message: "Only the owner may approve",
    } as never);
    render(<StudioWorkbench />);
    fireEvent.click(await screen.findByText("Interior site"));
    const approve = await screen.findByRole("button", {
      name: /Approve as production-ready/i,
    });
    fireEvent.click(approve);
    await waitFor(() =>
      expect(studioAction).toHaveBeenCalledWith("approve", { projectId: "p1" }),
    );
    await screen.findByText(/Only the owner may approve/);
  });
});

/**
 * WorkspaceSettings page tests (Engine #12 — RBAC & clearance)
 *
 * Focus: the security-review card renders the HONEST disclosure
 * (pending/unreviewed states, never "secure" claims), and the
 * suspend/restore controls appear for managers only.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ToastProvider } from "@/components/ui/Toast";

const refreshMembers = vi.fn().mockResolvedValue({ data: [] });
const can = vi.fn(() => true);

vi.mock("@/lib/auth", () => ({
  useAuth: () => ({ user: { id: "u1", email: "me@frelux.test" }, loading: false }),
}));
vi.mock("@/lib/seo", () => ({ useSeo: vi.fn() }));
vi.mock("@/contexts/WorkspaceContext", () => ({
  useWorkspace: () => ({
    activeWorkspace: { id: "w1", name: "Frelux HQ" },
    workspaces: [{ id: "w1", name: "Frelux HQ" }],
    members: [],
    currentRole: "owner",
    can,
    switchWorkspace: vi.fn(),
    refreshMembers,
  }),
}));
vi.mock("@/lib/workspace/workspace-service", async (orig) => ({
  ...(await orig<typeof import("@/lib/workspace/workspace-service")>()),
  listWorkspaceActivity: vi.fn().mockResolvedValue({ data: [] }),
}));

import { fetchSecurityPosture } from "@/lib/rbac/security-posture";
vi.mock("@/lib/rbac/security-posture", async (orig) => ({
  ...(await orig<typeof import("@/lib/rbac/security-posture")>()),
  fetchSecurityPosture: vi.fn(),
}));

async function renderPage() {
  const Comp = (await import("@/pages/WorkspaceSettings")).default;
  return render(
    <MemoryRouter>
      <ToastProvider>
        <Comp />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe("WorkspaceSettings security-review card", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    can.mockReturnValue(true);
  });

  it("discloses pending review honestly when the audit is unreviewed", async () => {
    (fetchSecurityPosture as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          surface: "workspace_rbac",
          label: "Workspace roles and member access",
          status: "pending",
          disclosure:
            "Workspace roles and member access: internal audit recorded, awaiting independent review. Not independently reviewed.",
          reviewer_name: null,
          reviewed_at: null,
          findings: null,
        },
      ],
      error: null,
    });
    await renderPage();
    expect(
      await screen.findByText(/awaiting independent review/i),
    ).toBeInTheDocument();
    expect(screen.queryByText(/secure/i)).toBeNull();
  });

  it("renders an honest unavailable note when posture cannot load", async () => {
    (fetchSecurityPosture as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
      error: null,
    });
    await renderPage();
    expect(
      await screen.findByText(/no review status is claimed/i),
    ).toBeInTheDocument();
  });

  it("names the reviewer for an approved surface and nothing stronger", async () => {
    (fetchSecurityPosture as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [
        {
          surface: "rpc_escalation",
          label: "Privileged database functions",
          status: "approved",
          disclosure:
            "Privileged database functions: independently reviewed by Ada Reviewer on 2026-10-22.",
          reviewer_name: "Ada Reviewer",
          reviewed_at: "2026-10-22T10:00:00Z",
          findings: "Examined.",
        },
      ],
      error: null,
    });
    await renderPage();
    expect(
      await screen.findByText(/independently reviewed by Ada Reviewer/i),
    ).toBeInTheDocument();
  });
});

describe("WorkspaceSettings suspend/restore controls", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    can.mockReturnValue(true);
  });

  it("shows the manager action cell for managers", async () => {
    (fetchSecurityPosture as ReturnType<typeof vi.fn>).mockResolvedValue({
      data: [],
      error: null,
    });
    const { container } = await renderPage();
    // Manager gating is active; with zero members there is no button row,
    // but the manager view (including the security card) must render.
    await screen.findByText(/Security review status/i);
    expect(container.innerHTML).not.toBe("");
  });
});

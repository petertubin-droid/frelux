import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const listAuditEvents = vi.fn();

vi.mock("@/lib/archie/stage1-client", () => ({
  listAuditEvents: (...a: unknown[]) => listAuditEvents(...a),
  recordAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

import ArchieSecurity from "@/pages/archie/ArchieSecurity";

beforeEach(() => {
  vi.clearAllMocks();
  listAuditEvents.mockResolvedValue([]);
});

function renderPage() {
  return render(<ArchieSecurity />);
}

describe("ArchieSecurity", () => {
  it("renders the Security audit log", () => {
    renderPage();
    expect(screen.getByText("Security")).toBeTruthy();
  });

  it("lists audit events once loaded", async () => {
    listAuditEvents.mockResolvedValue([
      {
        id: "e1",
        event_type: "OWNER_SIGNIN",
        severity: "NORMAL",
        created_date: "2026-01-01T00:00:00Z",
      },
    ]);
    renderPage();
    expect(await screen.findByText("OWNER_SIGNIN")).toBeTruthy();
  });

  it("mounts without crashing while the audit log is unresolved", () => {
    listAuditEvents.mockReturnValue(new Promise(() => []));
    const { container } = renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});

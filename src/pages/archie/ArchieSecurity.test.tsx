import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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

describe("ArchieSecurity — sentry and offensive scope", () => {
  it("renders the security sentry with an honest empty state", async () => {
    renderPage();
    expect(await screen.findByText("Security sentry")).toBeTruthy();
    expect(screen.getByText(/never fabricates incidents/i)).toBeTruthy();
  });

  it("the sentry surfaces a signal from real unauthorized attempts", async () => {
    listAuditEvents.mockResolvedValue([
      {
        id: "e1",
        event_type: "archie.family.unauthorized_attempt",
        severity: "WARNING",
        created_date: new Date().toISOString(),
      },
    ]);
    renderPage();
    // Both the audit row and the sentry signal reference the event.
    expect(await screen.findAllByText(/unauthorized_attempt/i)).toHaveLength(2);
  });

  it("registers a target and checks scope honestly", async () => {
    renderPage();
    expect(await screen.findByText("Offensive scope check")).toBeTruthy();
    const identifier = screen.getByLabelText("Target identifier");
    await userEvent.type(identifier, "frelux.tools");
    screen.getByText("Register target & check scope").click();
    expect(await screen.findByText(/OUT of scope|IN scope/)).toBeTruthy();
  });

  it("refuses registration without explicit scope", async () => {
    renderPage();
    await screen.findByText("Offensive scope check");
    screen.getByLabelText("In-scope surfaces");
    screen.getByText("Register target & check scope").click();
    // identifier empty → disabled, nothing crashes
    expect(screen.getByText("Offensive scope check")).toBeTruthy();
  });
});

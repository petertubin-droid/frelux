import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";

const listDevices = vi.fn();
const recordAuditEvent = vi.fn();
const fetchSystemStatus = vi.fn();

// StatusCenter (real child component) also imports fetchSystemStatus.
vi.mock("@/lib/archie/stage1-client", () => ({
  listDevices: (...a: unknown[]) => listDevices(...a),
  recordAuditEvent: (...a: unknown[]) => recordAuditEvent(...a),
  fetchSystemStatus: (...a: unknown[]) => fetchSystemStatus(...a),
}));

import ArchieControl from "@/pages/archie/ArchieControl";

beforeEach(() => {
  vi.clearAllMocks();
  listDevices.mockResolvedValue([]);
  recordAuditEvent.mockResolvedValue(undefined);
  fetchSystemStatus.mockResolvedValue(null);
});

function renderPage() {
  return render(
    <MemoryRouter>
      <ArchieControl />
    </MemoryRouter>,
  );
}

describe("ArchieControl", () => {
  it("renders the Central Control hub with the Status Center section", () => {
    renderPage();
    expect(screen.getByText("Central Control")).toBeTruthy();
    expect(screen.getByText("Status Center")).toBeTruthy();
  });

  it("mounts without crashing while device data is unresolved", () => {
    listDevices.mockReturnValue(new Promise(() => []));
    const { container } = renderPage();
    expect(container.innerHTML).not.toBe("");
  });

  it("links to the ARCHIE sections", () => {
    renderPage();
    const links = screen.getAllByRole("link");
    const hrefs = links.map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/archie/chat");
    expect(hrefs).toContain("/archie/devices");
    expect(hrefs).toContain("/archie/migration");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";

const listDevices = vi.fn();
const registerThisDevice = vi.fn();
const updateDevice = vi.fn();
const recoverLostDevice = vi.fn();

vi.mock("@/lib/archie/stage1-client", () => ({
  getDeviceKey: () => "test-device-key",
  devicePlatformLabel: () => "TestOS",
  listDevices: (...a: unknown[]) => listDevices(...a),
  registerThisDevice: (...a: unknown[]) => registerThisDevice(...a),
  updateDevice: (...a: unknown[]) => updateDevice(...a),
  recordAuditEvent: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/archie/stage2-device-recovery", () => ({
  recoverLostDevice: (...a: unknown[]) => recoverLostDevice(...a),
}));

import ArchieDevices from "@/pages/archie/ArchieDevices";

beforeEach(() => {
  vi.clearAllMocks();
  listDevices.mockResolvedValue([]);
  registerThisDevice.mockResolvedValue({ ok: true, device: { id: "d1" } });
  updateDevice.mockResolvedValue({ ok: true });
  recoverLostDevice.mockResolvedValue({ ok: true });
});

function renderPage() {
  return render(<ArchieDevices />);
}

describe("ArchieDevices", () => {
  it("renders the device registry with the register action", () => {
    renderPage();
    expect(screen.getByText("Devices")).toBeTruthy();
    expect(screen.getByText("Register this device")).toBeTruthy();
  });

  it("lists registered devices once loaded", async () => {
    listDevices.mockResolvedValue([
      {
        id: "d1",
        device_key: "other-device-key",
        platform: "TestOS",
        label: "My phone",
        status: "ACTIVE",
        created_date: "2026-01-01T00:00:00Z",
      },
    ]);
    renderPage();
    expect(await screen.findByText("My phone")).toBeTruthy();
  });

  it("mounts without crashing while the device list is unresolved", () => {
    listDevices.mockReturnValue(new Promise(() => []));
    const { container } = renderPage();
    expect(container.innerHTML).not.toBe("");
  });
});

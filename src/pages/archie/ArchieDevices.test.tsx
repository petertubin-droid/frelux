import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

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

const pairBluetoothDevice = vi.fn();
const pairUsbDevice = vi.fn();
const probeNetworkEndpoint = vi.fn();
const saveConnection = vi.fn();
const listConnections = vi.fn();
const listConnectionEvents = vi.fn();
const transitionConnection = vi.fn();

vi.mock("@/lib/archie/connections", () => ({
  detectConnectivityCapabilities: () => ({
    bluetooth: false,
    usb: false,
    network: true,
    mediaSession: false,
    systemVolume: false as const,
  }),
  pairBluetoothDevice: (...a: unknown[]) => pairBluetoothDevice(...a),
  pairUsbDevice: (...a: unknown[]) => pairUsbDevice(...a),
  probeNetworkEndpoint: (...a: unknown[]) => probeNetworkEndpoint(...a),
  saveConnection: (...a: unknown[]) => saveConnection(...a),
  listConnections: (...a: unknown[]) => listConnections(...a),
  listConnectionEvents: (...a: unknown[]) => listConnectionEvents(...a),
  transitionConnection: (...a: unknown[]) => transitionConnection(...a),
}));

import ArchieDevices from "@/pages/archie/ArchieDevices";

beforeEach(() => {
  vi.clearAllMocks();
  listConnections.mockResolvedValue([]);
  listConnectionEvents.mockResolvedValue([]);
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

  it("renders the connected-hardware section with honest capability report", () => {
    renderPage();
    expect(screen.getByText("Connected hardware & accounts")).toBeTruthy();
    // honest: this environment has no Web Bluetooth / WebUSB
    expect(
      screen.getByText("Bluetooth unavailable in this browser"),
    ).toBeTruthy();
    expect(screen.getByText("USB unavailable in this browser")).toBeTruthy();
    expect(
      screen.getByText("System volume — not controllable from a browser"),
    ).toBeTruthy();
  });

  it("disables pairing buttons for transports this browser lacks", () => {
    renderPage();
    const ble = screen.getByText("Pair Bluetooth device").closest("button");
    const usb = screen.getByText("Pair USB device").closest("button");
    expect(ble?.hasAttribute("disabled")).toBe(true);
    expect(usb?.hasAttribute("disabled")).toBe(true);
  });

  it("lists connected devices once the registry resolves", async () => {
    listConnections.mockResolvedValue([
      {
        id: "c1",
        owner_id: "u1",
        person_id: null,
        trusted_device_id: null,
        transport: "bluetooth",
        device_name: "Living-room speaker",
        device_kind: "speaker",
        manufacturer: "Acme",
        model: "S-1",
        status: "PAIRED",
        transport_address: {},
        permissions: ["media", "volume"],
        access_scope: {},
        last_seen_at: "2026-09-10T10:00:00Z",
        created_date: "2026-09-10T10:00:00Z",
        updated_date: "2026-09-10T10:00:00Z",
      },
    ]);
    renderPage();
    expect(await screen.findByText("Living-room speaker")).toBeTruthy();
    expect(screen.getByText("PAIRED")).toBeTruthy();
    expect(
      screen.getByText("bluetooth · speaker · media, volume"),
    ).toBeTruthy();
  });

  it("shows an honest unreachable result from the network probe", async () => {
    probeNetworkEndpoint.mockResolvedValue({
      reachable: false,
      reason: "network-unreachable",
      message: "Failed to fetch",
    });
    renderPage();
    const input = screen.getByLabelText("Network endpoint to probe");
    fireEvent.change(input, { target: { value: "http://10.0.0.99/" } });
    fireEvent.click(screen.getByText("Probe endpoint"));
    expect(
      await screen.findByText(/Not reachable \(network-unreachable\)/),
    ).toBeTruthy();
  });
});

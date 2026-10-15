import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import IotTelemetry from "./IotTelemetry";

vi.mock("@/lib/seo", () => ({ useSeo: vi.fn() }));
vi.mock("@/lib/auth", () => ({ useAuth: () => ({ user: { id: "u1" } }) }));

const devices = [
  {
    id: "d1",
    owner: "u1",
    name: "Pour 12 sensor",
    device_type: "concrete_maturity_sensor",
    provider: "Vendor A",
    market_code: "NG",
    status: "active",
    api_key_hash: "a".repeat(64),
    consent_granted_at: "2026-10-10T00:00:00Z",
    consent_scope: "in-place concrete temperature",
    retention_days: 90,
    last_seen_at: null,
    created_date: "2026-10-10T00:00:00Z",
    updated_date: "2026-10-10T00:00:00Z",
  },
];
const telemetry = [
  {
    id: 1,
    device_id: "d1",
    recorded_at: "2026-10-15T10:00:00Z",
    received_at: "2026-10-15T10:01:00Z",
    metric: "concrete_temp_c",
    value: 24.5,
    unit: "celsius",
    quality_flag: "valid",
    notes: null,
  },
  {
    id: 3,
    device_id: "d1",
    recorded_at: "2026-10-15T12:00:00Z",
    received_at: "2026-10-15T12:01:00Z",
    metric: "concrete_temp_c",
    value: 24.5,
    unit: "celsius",
    quality_flag: "valid",
    notes: null,
  },
  {
    id: 2,
    device_id: "d1",
    recorded_at: "2026-10-15T11:00:00Z",
    received_at: "2026-10-15T11:01:00Z",
    metric: "concrete_temp_c",
    value: 900,
    unit: "celsius",
    quality_flag: "suspect",
    notes: "value outside plausible range -20..110 celsius",
  },
];

vi.mock("@/lib/iot/device-client", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/iot/device-client")
  >("@/lib/iot/device-client");
  return {
    ...actual,
    listDevices: vi.fn(async () => devices),
    listDeviceTelemetry: vi.fn(async () => telemetry),
    registerDevice: vi.fn(async () => ({
      device: {
        ...devices[0],
        id: "d2",
        consent_granted_at: null,
      },
      api_key: "flx_live_testkey",
    })),
    recordConsent: vi.fn(async () => undefined),
    setDeviceStatus: vi.fn(async () => undefined),
    deleteDevice: vi.fn(async () => undefined),
  };
});

describe("IotTelemetry page (engine #7 M1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists devices with consent status and quality-flagged telemetry", async () => {
    render(
      <MemoryRouter>
        <IotTelemetry />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Pour 12 sensor")).toBeInTheDocument();
    expect(screen.getByText(/Consent recorded/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /View telemetry/i }));
    expect((await screen.findAllByText("24.5 celsius")).length).toBe(2);
    expect(screen.getAllByText("valid").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("suspect")).toBeInTheDocument();
    expect(screen.getByTitle("value outside plausible range -20..110 celsius")).toBeInTheDocument();
  });

  it("registers a device and shows the raw API key exactly once with hash disclosure", async () => {
    render(
      <MemoryRouter>
        <IotTelemetry />
      </MemoryRouter>,
    );
    fireEvent.change(
      await screen.findByPlaceholderText("Pour 12 — maturity sensor"),
      { target: { value: "New sensor" } },
    );
    fireEvent.change(
      screen.getByPlaceholderText(/What this device collects/),
      { target: { value: "ambient temperature" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /Register device/i }));

    expect(await screen.findByText(/flx_live_testkey/)).toBeInTheDocument();
    expect(
      screen.getByText(/shown once, never stored in plaintext/i),
    ).toBeInTheDocument();
    const { registerDevice, recordConsent } = await import(
      "@/lib/iot/device-client"
    );
    expect(registerDevice).toHaveBeenCalledWith(
      expect.objectContaining({ name: "New sensor" }),
    );
    expect(recordConsent).toHaveBeenCalled();
  });

  it("refuses to register without a consent scope", async () => {
    render(
      <MemoryRouter>
        <IotTelemetry />
      </MemoryRouter>,
    );
    fireEvent.change(
      await screen.findByPlaceholderText("Pour 12 — maturity sensor"),
      { target: { value: "Scopeless sensor" } },
    );
    fireEvent.click(screen.getByRole("button", { name: /Register device/i }));
    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent(/consent scope are both required/i);
    const { registerDevice } = await import("@/lib/iot/device-client");
    expect(registerDevice).not.toHaveBeenCalled();
  });
});

describe("IotTelemetry derived project state (engine #7 M2)", () => {
  it("shows the Nurse-Saul maturity index with the no-strength disclaimer", async () => {
    render(
      <MemoryRouter>
        <IotTelemetry />
      </MemoryRouter>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /View telemetry/i }),
    );
    expect(await screen.findByText(/Derived project state/i)).toBeInTheDocument();
    expect(screen.getByText(/°C·h/)).toBeInTheDocument();
    expect(
      screen.getByText(/no strength value is derived/i),
    ).toBeInTheDocument();
  });

  it("shows the honest refusal when only one valid reading exists", async () => {
    const { listDeviceTelemetry } = await import("@/lib/iot/device-client");
    (listDeviceTelemetry as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      telemetry[0],
    ]);
    render(
      <MemoryRouter>
        <IotTelemetry />
      </MemoryRouter>,
    );
    fireEvent.click(
      await screen.findByRole("button", { name: /View telemetry/i }),
    );
    expect(
      await screen.findByText(/At least 2 valid concrete_temp_c readings/),
    ).toBeInTheDocument();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import IotTelemetry from "./IotTelemetry";
import type { IotSafetyThresholdRow } from "@/lib/iot/safety-alerts";

vi.mock("@/lib/seo", () => ({ useSeo: vi.fn() }));
vi.mock("@/lib/auth", () => {
  const user = { id: "u1" };
  return { useAuth: () => ({ user }) };
});

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
  {
    id: "d2",
    owner: "u1",
    name: "Site vibration monitor",
    device_type: "vibration_monitor",
    provider: "Instantel Micromate",
    market_code: "NG",
    status: "paused",
    api_key_hash: "b".repeat(64),
    consent_granted_at: "2026-10-11T00:00:00Z",
    consent_scope: "ground vibration evidence",
    retention_days: 90,
    last_seen_at: null,
    created_date: "2026-10-11T00:00:00Z",
    updated_date: "2026-10-11T00:00:00Z",
  },
];
const safetyThresholds: IotSafetyThresholdRow[] = [
  {
    id: "t1",
    metric: "vibration_mm_s",
    device_type: "vibration_monitor",
    market_code: "NG",
    threshold_value: 5,
    threshold_unit: "mm_s",
    direction: "above",
    basis: "Reviewed DIN 4150-3-derived limit",
    source_url: null,
    review_status: "approved",
    reviewer_name: "Eng. Reviewer",
    reviewer_credentials: "PE",
    review_notes: null,
    reviewed_at: "2026-10-14T00:00:00Z",
    created_at: "2026-10-13T00:00:00Z",
    updated_at: "2026-10-14T00:00:00Z",
  },
  {
    id: "t2",
    metric: "vibration_mm_s",
    device_type: null,
    market_code: null,
    threshold_value: 1,
    threshold_unit: "mm_s",
    direction: "above",
    basis: "PENDING — must never alert",
    source_url: null,
    review_status: "pending",
    reviewer_name: null,
    reviewer_credentials: null,
    review_notes: null,
    reviewed_at: null,
    created_at: "2026-10-13T00:00:00Z",
    updated_at: "2026-10-13T00:00:00Z",
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

const vibrationTelemetry = [
  {
    id: 10,
    device_id: "d2",
    recorded_at: "2026-10-15T08:00:00Z",
    received_at: "2026-10-15T08:01:00Z",
    metric: "vibration_mm_s",
    value: 8.2,
    unit: "mm_s",
    quality_flag: "valid",
    notes: null,
  },
  {
    id: 11,
    device_id: "d2",
    recorded_at: "2026-10-15T10:00:00Z",
    received_at: "2026-10-15T10:01:00Z",
    metric: "vibration_mm_s",
    value: 500,
    unit: "mm_s",
    quality_flag: "suspect",
    notes: "above plausible range",
  },
];

vi.mock("@/lib/iot/device-client", async () => {
  const actual = await vi.importActual<
    typeof import("@/lib/iot/device-client")
  >("@/lib/iot/device-client");
  return {
    ...actual,
    listDevices: vi.fn(async () => devices),
    listDeviceTelemetry: vi.fn(async (id: string) =>
      id === "d2" ? vibrationTelemetry : telemetry,
    ),
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
    listIotSafetyThresholds: vi.fn(async () => safetyThresholds),
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
    expect(screen.getAllByText(/Consent recorded/).length).toBe(2);

    fireEvent.click(screen.getAllByRole("button", { name: /View telemetry/i })[0]);
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
      (await screen.findAllByRole("button", { name: /View telemetry/i }))[0],
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
      (await screen.findAllByRole("button", { name: /View telemetry/i }))[0],
    );
    expect(
      await screen.findByText(/At least 2 valid concrete_temp_c readings/),
    ).toBeInTheDocument();
  });
});

describe("IotTelemetry provider catalog (engine #7 M3)", () => {
  it("renders the verified catalog with citations and the no-connection disclosure", async () => {
    render(
      <MemoryRouter>
        <IotTelemetry />
      </MemoryRouter>,
    );
    expect(
      await screen.findByText(/Verified provider catalog/i),
    ).toBeInTheDocument();
    expect(
      screen.getAllByText(/no authorized API connection to any telemetry provider/i).length,
    ).toBeGreaterThanOrEqual(1);
    // every catalog entry shows its verified source host
    for (const hostPattern of [
      /giatecscientific\.com/,
      /commandcenterconcrete\.com/,
      /instantel\.com/,
      /orica\.com/,
      /davisinstruments\.com/,
      /samsara\.com/,
      /developers\.geotab\.com/,
    ]) {
      expect(screen.getAllByText(hostPattern).length).toBeGreaterThanOrEqual(1);
    }
  });

  it("shows the matched provider disclosure on known-provider device cards", async () => {
    render(
      <MemoryRouter>
        <IotTelemetry />
      </MemoryRouter>,
    );
    expect(await screen.findByText("Site vibration monitor")).toBeInTheDocument();
    expect(
      screen.getByText(/Instantel Micromate:.*Vibration, sound\/noise, and air-overpressure/s),
    ).toBeInTheDocument();
  });

  it("never shows a catalog disclosure for unknown provider text", async () => {
    render(
      <MemoryRouter>
        <IotTelemetry />
      </MemoryRouter>,
    );
    await screen.findByText("Pour 12 sensor");
    // Vendor A is unknown — no invented disclosure on its card
    expect(
      screen.queryByText(/Vendor A: /),
    ).not.toBeInTheDocument();
  });
});

describe("IotTelemetry safety alerts (engine #7 M4)", () => {
  it("renders an alert when an APPROVED threshold is breached, citing the reviewer", async () => {
    render(
      <MemoryRouter>
        <IotTelemetry />
      </MemoryRouter>,
    );
    fireEvent.click(
      (await screen.findAllByRole("button", { name: /View telemetry/i }))[1],
    );
    expect(await screen.findByText(/Safety alerts/i)).toBeInTheDocument();
    expect(screen.getByText(/breaches the reviewed maximum/i)).toBeInTheDocument();
    expect(screen.getByText(/Reviewed by Eng. Reviewer/i)).toBeInTheDocument();
  });

  it("discloses no-verdict when only pending thresholds exist", async () => {
    const { listIotSafetyThresholds } = await import("@/lib/iot/device-client");
    (listIotSafetyThresholds as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
      safetyThresholds[1],
    ]);
    render(
      <MemoryRouter>
        <IotTelemetry />
      </MemoryRouter>,
    );
    fireEvent.click(
      (await screen.findAllByRole("button", { name: /View telemetry/i }))[1],
    );
    expect(await screen.findByText(/Safety alerts/i)).toBeInTheDocument();
    expect(
      screen.getByText(/No independently reviewed safety threshold is on record/i),
    ).toBeInTheDocument();
  });
});

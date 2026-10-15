/**
 * IoT & Telematics — FRELUX engine #7 UI (M1). Contractor
 * workspace page.
 *
 * Owner-scoped device onboarding for the strict ingest API:
 *  - register a device (API key generated client-side, hashed
 *    server-stored, raw key shown EXACTLY ONCE),
 *  - record explicit data-collection consent (ingestion refuses
 *    devices without it),
 *  - pause / retire / delete devices,
 *  - browse validated telemetry with quality flags.
 *
 * Honest disclosures everywhere: the app never writes telemetry
 * directly (ingest is the service-role edge function), and
 * out-of-range values are stored as SUSPECT, never silently
 * accepted.
 */

import { useCallback, useEffect, useState } from "react";
import {
  DEVICE_TYPES,
  deleteDevice,
  listDeviceTelemetry,
  listDevices,
  recordConsent,
  registerDevice,
  setDeviceStatus,
  type DeviceType,
  type IotDeviceRow,
  type TelemetryRow,
} from "@/lib/iot/device-client";
import { useAuth } from "@/lib/auth";
import { useSeo } from "@/lib/seo";
import { Loader2, Radio, Plus, ShieldCheck, X, Copy } from "lucide-react";
import { Button } from "@/components/ui/shadcn/button";

type FreshKey = { deviceId: string; apiKey: string } | null;

const MARKET_CODES = [
  "NG", "US", "GB", "CA", "AU", "DE", "IN", "GH", "KE", "ZA",
  "JP", "FR", "BR", "SA", "AE", "CN", "ID", "MX", "KR", "IT",
] as const;

const DEVICE_TYPE_LABELS: Record<DeviceType, string> = {
  concrete_maturity_sensor: "Concrete maturity sensor",
  weather_station: "Weather station",
  vibration_monitor: "Vibration monitor",
  gps_tracker: "GPS tracker",
  generic_telemetry: "Generic telemetry device",
};

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary";

export default function IotTelemetry() {
  useSeo({
    title: "IoT & Telematics | FRELUX Contractor Workspace",
    description:
      "Register project IoT devices with consent-gated, key-authenticated telemetry ingestion and validated signal quality.",
    noIndex: true,
  });
  const { user } = useAuth();
  const [devices, setDevices] = useState<IotDeviceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [freshKey, setFreshKey] = useState<FreshKey>(null);
  const [selectedDevice, setSelectedDevice] = useState<string | null>(null);
  const [telemetry, setTelemetry] = useState<TelemetryRow[]>([]);
  const [telemetryLoading, setTelemetryLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    device_type: "concrete_maturity_sensor" as DeviceType,
    market_code: "NG",
    provider: "",
    consent_scope: "",
  });
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setDevices(await listDevices());
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load devices");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void refresh();
    else setLoading(false);
  }, [user, refresh]);

  const loadTelemetry = useCallback(async (deviceId: string) => {
    setSelectedDevice(deviceId);
    setTelemetryLoading(true);
    try {
      setTelemetry(await listDeviceTelemetry(deviceId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load telemetry");
    } finally {
      setTelemetryLoading(false);
    }
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.consent_scope.trim()) {
      setError("Device name and consent scope are both required.");
      return;
    }
    setBusy(true);
    try {
      const { device, api_key } = await registerDevice({
        name: form.name.trim(),
        device_type: form.device_type,
        market_code: form.market_code,
        provider: form.provider.trim() || null,
      });
      // consent gate: owner records explicit scope at registration
      await recordConsent(device.id, form.consent_scope.trim());
      setFreshKey({ deviceId: device.id, apiKey: api_key });
      setForm({
        name: "",
        device_type: "concrete_maturity_sensor",
        market_code: form.market_code,
        provider: "",
        consent_scope: "",
      });
      await refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  };

  if (!user) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <h1 className="text-2xl font-bold">IoT &amp; Telematics</h1>
        <p className="mt-3 text-muted-foreground">
          Sign in to register project devices and view validated telemetry.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <div className="flex items-center gap-3">
        <Radio className="size-7 text-primary" aria-hidden />
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">IoT &amp; Telematics</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Consent-gated, key-authenticated device ingestion with strict
            signal validation.
          </p>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {freshKey && (
        <div className="mt-6 rounded-2xl border border-primary/40 bg-primary/5 p-5">
          <div className="flex items-center gap-2 font-semibold">
            <ShieldCheck className="size-5 text-primary" aria-hidden />
            Device API key — shown once, never stored in plaintext
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <code className="flex-1 overflow-x-auto rounded-lg bg-muted px-3 py-2 text-xs">
              {freshKey.apiKey}
            </code>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void navigator.clipboard?.writeText(freshKey.apiKey)}
              aria-label="Copy device API key"
            >
              <Copy className="size-4" aria-hidden /> Copy
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFreshKey(null)}
              aria-label="Dismiss key"
            >
              <X className="size-4" aria-hidden /> Done
            </Button>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            POST readings to the ingest endpoint as
            {" "}
            <code>{`{ "device_id": "${freshKey.deviceId}", "api_key": "<key>", "readings": [{ "metric", "value", "unit", "recorded_at" }] }`}</code>
            . The key is stored only as a SHA-256 hash; if you lose it,
            register a replacement device.
          </p>
        </div>
      )}

      <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold">
            <Plus className="size-5 text-primary" aria-hidden /> Register device
          </h2>
          <form className="mt-4 space-y-3" onSubmit={submit}>
            <label className="grid gap-1 text-xs font-medium">
              Device name
              <input
                className={inputClass}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Pour 12 — maturity sensor"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Device type
              <select
                className={inputClass}
                value={form.device_type}
                onChange={(e) =>
                  setForm({ ...form, device_type: e.target.value as DeviceType })
                }
              >
                {DEVICE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {DEVICE_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Market
              <select
                className={inputClass}
                value={form.market_code}
                onChange={(e) => setForm({ ...form, market_code: e.target.value })}
              >
                {MARKET_CODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Provider (optional)
              <input
                className={inputClass}
                value={form.provider}
                onChange={(e) => setForm({ ...form, provider: e.target.value })}
                placeholder="Sensor vendor / fleet operator"
              />
            </label>
            <label className="grid gap-1 text-xs font-medium">
              Consent scope
              <input
                className={inputClass}
                value={form.consent_scope}
                onChange={(e) => setForm({ ...form, consent_scope: e.target.value })}
                placeholder="What this device collects, e.g. in-place concrete temperature"
              />
            </label>
            <Button type="submit" disabled={busy} className="w-full">
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                "Register device"
              )}
            </Button>
          </form>
          <p className="mt-4 text-xs text-muted-foreground">
            Registration records your explicit consent for the stated scope.
            Devices without recorded consent are refused at ingestion, and
            telemetry rows are written only by the validated ingest endpoint.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <h2 className="text-lg font-bold">Your devices</h2>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="size-6 animate-spin text-muted-foreground" aria-hidden />
            </div>
          ) : devices.length === 0 ? (
            <p className="mt-4 text-sm text-muted-foreground">
              No devices registered yet. Registered devices appear here with
              their consent status and latest telemetry.
            </p>
          ) : (
            <ul className="mt-4 space-y-3">
              {devices.map((d) => (
                <li
                  key={d.id}
                  className="rounded-xl border border-border p-4 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-semibold">{d.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {DEVICE_TYPE_LABELS[d.device_type as DeviceType] ?? d.device_type}
                        {" · "}
                        {d.market_code}
                        {d.provider ? ` · ${d.provider}` : ""}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        d.status === "active"
                          ? "bg-primary/10 text-primary"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {d.status}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {d.consent_granted_at ? (
                      <>
                        <ShieldCheck className="mr-1 inline size-3.5 text-primary" aria-hidden />
                        Consent recorded
                        {d.consent_scope ? `: ${d.consent_scope}` : ""}
                      </>
                    ) : (
                      "No consent recorded — ingestion refused"
                    )}
                    {d.last_seen_at &&
                      ` · last seen ${new Date(d.last_seen_at).toLocaleString()}`}
                    {` · retention ${d.retention_days} days`}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => void loadTelemetry(d.id)}
                    >
                      View telemetry
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={async () => {
                        await setDeviceStatus(
                          d.id,
                          d.status === "active" ? "paused" : "active",
                        );
                        await refresh();
                      }}
                    >
                      {d.status === "active" ? "Pause" : "Activate"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={async () => {
                        await deleteDevice(d.id);
                        if (selectedDevice === d.id) {
                          setSelectedDevice(null);
                          setTelemetry([]);
                        }
                        await refresh();
                      }}
                    >
                      Delete
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}

          {selectedDevice && (
            <div className="mt-6">
              <h3 className="font-semibold">Telemetry</h3>
              {telemetryLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" aria-hidden />
                </div>
              ) : telemetry.length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">
                  No validated readings stored for this device yet.
                </p>
              ) : (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="text-muted-foreground">
                      <tr>
                        <th className="py-1.5 pr-4">Recorded</th>
                        <th className="py-1.5 pr-4">Metric</th>
                        <th className="py-1.5 pr-4">Value</th>
                        <th className="py-1.5 pr-4">Quality</th>
                      </tr>
                    </thead>
                    <tbody>
                      {telemetry.slice(0, 50).map((t) => (
                        <tr key={t.id} className="border-t border-border">
                          <td className="py-1.5 pr-4">
                            {new Date(t.recorded_at).toLocaleString()}
                          </td>
                          <td className="py-1.5 pr-4">{t.metric}</td>
                          <td className="py-1.5 pr-4">
                            {t.value} {t.unit}
                          </td>
                          <td className="py-1.5 pr-4">
                            <span
                              className={`rounded-full px-2 py-0.5 ${
                                t.quality_flag === "valid"
                                  ? "bg-primary/10 text-primary"
                                  : "bg-destructive/10 text-destructive"
                              }`}
                              title={t.notes ?? undefined}
                            >
                              {t.quality_flag}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {telemetry.length > 50 && (
                    <p className="mt-2 text-xs text-muted-foreground">
                      Showing the latest 50 of {telemetry.length} readings.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

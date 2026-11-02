// =========================================================
// FRELUX ENGINE #7 — IoT DEVICE MANAGEMENT (M1, client side)
//
// Owner-scoped device onboarding for the strict ingest API:
//   * the device API key is generated client-side with the
//     Web Crypto API, hashed with SHA-256, and ONLY the hash
//     is stored — the raw key is shown to the owner exactly
//     once at registration and never persisted
//   * registration refuses to mark consent until the owner
//     explicitly records it (consent gate)
//   * telemetry is read-only from the app: the only write
//     path is the iot-ingest edge function
// =========================================================

import { getSupabase } from "@/lib/supabase-lazy";

export interface IotDeviceRow {
  id: string;
  owner: string;
  name: string;
  device_type: string;
  provider: string | null;
  market_code: string;
  status: "active" | "paused" | "retired";
  api_key_hash: string;
  consent_granted_at: string | null;
  consent_scope: string | null;
  retention_days: number;
  last_seen_at: string | null;
  created_date: string;
  updated_date: string;
}

export interface TelemetryRow {
  id: number;
  device_id: string;
  recorded_at: string;
  received_at: string;
  metric: string;
  value: number;
  unit: string;
  quality_flag: "valid" | "suspect";
  notes: string | null;
}

// M4: safety thresholds are PUBLIC reference data (RLS: everyone reads,
// only admins write) — the app can never manufacture its own.
export async function listIotSafetyThresholds(): Promise<
  import("./safety-alerts").IotSafetyThresholdRow[]
> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("iot_safety_thresholds")
    .select(
      "id, metric, device_type, market_code, threshold_value, threshold_unit, direction, basis, source_url, review_status, reviewer_name, reviewer_credentials, review_notes, reviewed_at, created_at, updated_at",
    )
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as import("./safety-alerts").IotSafetyThresholdRow[];
}

export const DEVICE_TYPES = [
  "concrete_maturity_sensor",
  "weather_station",
  "vibration_monitor",
  "gps_tracker",
  "generic_telemetry",
] as const;

export type DeviceType = (typeof DEVICE_TYPES)[number];

export interface RegisterDeviceInput {
  name: string;
  device_type: DeviceType;
  market_code: string;
  provider?: string | null;
  retention_days?: number;
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function randomHex(bytes: number): string {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export interface RegisteredDevice {
  device: IotDeviceRow;
  /** Raw key — returned ONCE here, never stored or retrievable again */
  api_key: string;
}

/**
 * Register a device. The row is created with consent NOT granted
 * (consent_granted_at null) so the ingest function refuses it
 * until the owner explicitly records consent via recordConsent.
 */
export async function registerDevice(
  input: RegisterDeviceInput,
): Promise<RegisteredDevice> {
  const supabase = await getSupabase();
  const api_key = `flx_live_${randomHex(24)}`;
  const api_key_hash = await sha256Hex(api_key);
  const { data, error } = await supabase
    .from("iot_devices")
    .insert({
      name: input.name,
      device_type: input.device_type,
      market_code: input.market_code.toUpperCase(),
      provider: input.provider ?? null,
      retention_days: input.retention_days ?? 90,
      api_key_hash,
      consent_granted_at: null,
    })
    .select()
    .single();
  if (error) throw new Error(`Device registration failed: ${error.message}`);
  return { device: data as IotDeviceRow, api_key };
}

/** Owner records explicit data-collection consent for a device. */
export async function recordConsent(
  deviceId: string,
  consentScope: string,
): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("iot_devices")
    .update({
      consent_granted_at: new Date().toISOString(),
      consent_scope: consentScope,
    })
    .eq("id", deviceId);
  if (error) throw new Error(`Consent recording failed: ${error.message}`);
}

/** Pause / retire a device — paused devices are refused at ingest. */
export async function setDeviceStatus(
  deviceId: string,
  status: "active" | "paused" | "retired",
): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("iot_devices")
    .update({ status })
    .eq("id", deviceId);
  if (error) throw new Error(`Status update failed: ${error.message}`);
}

export async function deleteDevice(deviceId: string): Promise<void> {
  const supabase = await getSupabase();
  const { error } = await supabase
    .from("iot_devices")
    .delete()
    .eq("id", deviceId);
  if (error) throw new Error(`Device deletion failed: ${error.message}`);
}

export async function listDevices(): Promise<IotDeviceRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("iot_devices")
    .select("*")
    .order("created_date", { ascending: false })
    .limit(200);
  if (error) throw new Error(`Device list failed: ${error.message}`);
  return (data ?? []) as IotDeviceRow[];
}

export async function listDeviceTelemetry(
  deviceId: string,
  limit = 200,
): Promise<TelemetryRow[]> {
  const supabase = await getSupabase();
  const { data, error } = await supabase
    .from("iot_telemetry")
    .select("*")
    .eq("device_id", deviceId)
    .order("recorded_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(`Telemetry read failed: ${error.message}`);
  return (data ?? []) as TelemetryRow[];
}

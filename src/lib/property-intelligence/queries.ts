/**
 * FRELUX PROPERTY INTELLIGENCE, PERSISTENCE QUERIES
 *
 * Prompt 4, Phase 2 + 14: typed access to the `properties` table.
 * Pure mapping lives here so it can be tested without Supabase;
 * CRUD functions wrap the client and degrade to professional
 * error states, never mock data, never swallowed failures.
 */

import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import type {
  PropertyProfile,
  Provenance,
  PropertyType,
  ConstructionStatus,
} from "./types";

/** Document/image attachment: storage key + kind + provenance. */
export interface PropertyDocument {
  id: string;
  kind: string;
  provenance: Provenance;
}

// =========================================================
// Row <-> profile mapping (pure, testable)
// =========================================================

export interface PropertyRow {
  id: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  name: string | null;
  address: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  district: string | null;
  lat: number | null;
  lng: number | null;
  property_type: string | null;
  building_type: string | null;
  number_of_buildings: number | null;
  number_of_floors: number | null;
  number_of_rooms: number | null;
  existing_condition: string | null;
  development_status: string | null;
  land_size: number | null;
  land_unit: string | null;
  construction_status: string | null;
  construction_project_id: string | null;
  documents: unknown;
  provenance: unknown;
}

/** DB row → PropertyProfile. NULLs stay undefined, never defaulted, never guessed. */
export function rowToProfile(row: PropertyRow): PropertyProfile {
  return {
    id: row.id,
    name: row.name ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    location: {
      address: row.address ?? undefined,
      country: row.country ?? undefined,
      region: row.region ?? undefined,
      city: row.city ?? undefined,
      district: row.district ?? undefined,
      coordinates:
        row.lat !== null && row.lng !== null
          ? { lat: row.lat, lng: row.lng }
          : undefined,
    },
    propertyType: (row.property_type as PropertyType | null) ?? undefined,
    buildingType: row.building_type ?? undefined,
    numberOfBuildings: row.number_of_buildings ?? undefined,
    numberOfFloors: row.number_of_floors ?? undefined,
    numberOfRooms: row.number_of_rooms ?? undefined,
    existingCondition: row.existing_condition ?? undefined,
    developmentStatus:
      (row.development_status as PropertyProfile["developmentStatus"] | null) ??
      undefined,
    land:
      row.land_size !== null && row.land_unit
        ? {
            size: row.land_size,
            unit: row.land_unit,
            provenance: undefined,
          }
        : undefined,
    constructionStatus:
      (row.construction_status as ConstructionStatus | null) ?? undefined,
    constructionProjectId: row.construction_project_id ?? undefined,
    documents: Array.isArray(row.documents)
      ? (row.documents as PropertyDocument[])
      : [],
    provenance: (row.provenance as Provenance | null) ?? undefined,
  };
}

/** PropertyProfile (partial input) → DB row payload. Only valid columns are sent. */
export function profileToRowInput(
  profile: Partial<PropertyProfile>,
): Record<string, unknown> {
  const input: Record<string, unknown> = {};
  if (profile.name !== undefined) input.name = profile.name || null;
  if (profile.location?.address !== undefined)
    input.address = profile.location.address || null;
  if (profile.location?.country !== undefined)
    input.country = profile.location.country?.trim().toUpperCase() || null;
  if (profile.location?.region !== undefined)
    input.region = profile.location.region || null;
  if (profile.location?.city !== undefined)
    input.city = profile.location.city || null;
  if (profile.location?.district !== undefined)
    input.district = profile.location.district || null;
  if (profile.location?.coordinates !== undefined) {
    input.lat = profile.location.coordinates?.lat ?? null;
    input.lng = profile.location.coordinates?.lng ?? null;
  }
  if (profile.propertyType !== undefined)
    input.property_type = profile.propertyType || null;
  if (profile.buildingType !== undefined)
    input.building_type = profile.buildingType || null;
  if (profile.numberOfBuildings !== undefined)
    input.number_of_buildings = profile.numberOfBuildings || null;
  if (profile.numberOfFloors !== undefined)
    input.number_of_floors = profile.numberOfFloors || null;
  if (profile.numberOfRooms !== undefined)
    input.number_of_rooms = profile.numberOfRooms || null;
  if (profile.existingCondition !== undefined)
    input.existing_condition = profile.existingCondition || null;
  if (profile.developmentStatus !== undefined)
    input.development_status = profile.developmentStatus || null;
  if (profile.land !== undefined) {
    input.land_size = profile.land?.size || null;
    input.land_unit = profile.land?.unit || null;
  }
  if (profile.constructionStatus !== undefined)
    input.construction_status = profile.constructionStatus || null;
  if (profile.constructionProjectId !== undefined)
    input.construction_project_id = profile.constructionProjectId || null;
  if (profile.documents !== undefined)
    input.documents = profile.documents ?? [];
  if (profile.provenance !== undefined)
    input.provenance = profile.provenance ?? null;
  return input;
}

// =========================================================
// Query result shape, errors are surfaced, never hidden
// =========================================================

export type QueryOutcome<T> =
  { ok: true; data: T } | { ok: false; error: string };

export const NOT_CONFIGURED_ERROR =
  "Supabase is not configured. Property storage is unavailable.";

// =========================================================
// CRUD
// =========================================================

export async function listProperties(
  userId: string,
): Promise<QueryOutcome<PropertyProfile[]>> {
  if (!isSupabaseConfigured) return { ok: false, error: NOT_CONFIGURED_ERROR };
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("created_by", userId)
    .order("created_at", { ascending: false });
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: (data as PropertyRow[]).map(rowToProfile) };
}

export async function getProperty(
  userId: string,
  propertyId: string,
): Promise<QueryOutcome<PropertyProfile>> {
  if (!isSupabaseConfigured) return { ok: false, error: NOT_CONFIGURED_ERROR };
  const { data, error } = await supabase
    .from("properties")
    .select("*")
    .eq("id", propertyId)
    .eq("created_by", userId)
    .maybeSingle();
  if (error) return { ok: false, error: error.message };
  if (!data) return { ok: false, error: "Property not found." };
  return { ok: true, data: rowToProfile(data as PropertyRow) };
}

export async function createProperty(
  userId: string,
  input: Partial<PropertyProfile>,
): Promise<QueryOutcome<PropertyProfile>> {
  if (!isSupabaseConfigured) return { ok: false, error: NOT_CONFIGURED_ERROR };
  const payload = { ...profileToRowInput(input), created_by: userId };
  const { data, error } = await supabase
    .from("properties")
    .insert(payload)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: rowToProfile(data as PropertyRow) };
}

export async function updateProperty(
  userId: string,
  propertyId: string,
  input: Partial<PropertyProfile>,
): Promise<QueryOutcome<PropertyProfile>> {
  if (!isSupabaseConfigured) return { ok: false, error: NOT_CONFIGURED_ERROR };
  const { data, error } = await supabase
    .from("properties")
    .update(profileToRowInput(input))
    .eq("id", propertyId)
    .eq("created_by", userId)
    .select("*")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: rowToProfile(data as PropertyRow) };
}

export async function deleteProperty(
  userId: string,
  propertyId: string,
): Promise<QueryOutcome<true>> {
  if (!isSupabaseConfigured) return { ok: false, error: NOT_CONFIGURED_ERROR };
  const { error } = await supabase
    .from("properties")
    .delete()
    .eq("id", propertyId)
    .eq("created_by", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: true };
}

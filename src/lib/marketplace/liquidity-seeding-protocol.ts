/**
 * Marketplace Liquidity & Strategic Seeding Protocol
 *
 * Provides territory density gating, cold-start liquidity tiers,
 * accredited trade association seeding partnerships, and concierge dispatch.
 * Partner and capacity figures are demonstration targets and MUST NOT be presented as verified real-world affiliations.
 */

import { supabase } from "@/lib/supabase";

export type LiquidityTier =
  "tier_1_active" | "tier_2_seeded" | "tier_3_emerging";

export interface TerritoryLiquidityProfile {
  id: string;
  territoryName: string;
  countryCode: string;
  countryName: string;
  tier: LiquidityTier;
  tierLabel: string;
  densityScore: number;
  verifiedArtisanCount: number;
  activeMerchantNodes: number;
  partnerAssociation: string;
  partnerAcronym: string;
  partnerVerified: boolean;
  dispatchGuaranteedHours: number;
  escrowSupport:
    "instant_self_serve" | "assisted_concierge" | "on_demand_nomination";
  description: string;
}

export const LAUNCH_TERRITORIES: TerritoryLiquidityProfile[] = [
  {
    id: "ng-lagos",
    territoryName: "Lagos Metropolitan",
    countryCode: "NG",
    countryName: "Nigeria",
    tier: "tier_1_active",
    tierLabel: "Tier 1: Active Liquidity Target",
    densityScore: 94,
    verifiedArtisanCount: 42,
    activeMerchantNodes: 14,
    partnerAssociation: "Nigerian Institute of Building (NIOB)",
    partnerAcronym: "NIOB",
    partnerVerified: false,
    dispatchGuaranteedHours: 1,
    escrowSupport: "instant_self_serve",
    description:
      "Target launch hub for high-density coverage. Partner and capacity figures are unverified planning targets.",
  },
  {
    id: "ke-nairobi",
    territoryName: "Nairobi Urban Core",
    countryCode: "KE",
    countryName: "Kenya",
    tier: "tier_1_active",
    tierLabel: "Tier 1: Active Liquidity Target",
    densityScore: 91,
    verifiedArtisanCount: 38,
    activeMerchantNodes: 11,
    partnerAssociation: "Architectural Association of Kenya (AAK)",
    partnerAcronym: "AAK",
    partnerVerified: false,
    dispatchGuaranteedHours: 1,
    escrowSupport: "instant_self_serve",
    description:
      "Target launch hub. Local partner and verified network availability must be confirmed before enabling live services.",
  },
  {
    id: "gh-accra",
    territoryName: "Greater Accra",
    countryCode: "GH",
    countryName: "Ghana",
    tier: "tier_1_active",
    tierLabel: "Tier 1: Active Liquidity Target",
    densityScore: 88,
    verifiedArtisanCount: 29,
    activeMerchantNodes: 8,
    partnerAssociation: "Ghana Institution of Engineering (GhIE)",
    partnerAcronym: "GhIE",
    partnerVerified: false,
    dispatchGuaranteedHours: 2,
    escrowSupport: "instant_self_serve",
    description:
      "Target launch hub. Network counts are illustrative targets, not live inventory.",
  },
  {
    id: "gb-london",
    territoryName: "Greater London & Home Counties",
    countryCode: "GB",
    countryName: "United Kingdom",
    tier: "tier_1_active",
    tierLabel: "Tier 1: Active Liquidity Target",
    densityScore: 96,
    verifiedArtisanCount: 55,
    activeMerchantNodes: 20,
    partnerAssociation: "Royal Institution of Chartered Surveyors (RICS)",
    partnerAcronym: "RICS",
    partnerVerified: false,
    dispatchGuaranteedHours: 1,
    escrowSupport: "instant_self_serve",
    description:
      "Target UK hub for professional quantity surveying and regionalized BOQ exports.",
  },
  {
    id: "ng-abuja",
    territoryName: "Abuja Federal Capital",
    countryCode: "NG",
    countryName: "Nigeria",
    tier: "tier_2_seeded",
    tierLabel: "Tier 2: Concierge Seed Target",
    densityScore: 72,
    verifiedArtisanCount: 16,
    activeMerchantNodes: 5,
    partnerAssociation: "Federation of Construction Industry (FOCI)",
    partnerAcronym: "FOCI",
    partnerVerified: false,
    dispatchGuaranteedHours: 4,
    escrowSupport: "assisted_concierge",
    description:
      "Concierge-first territory until real local capacity and partnerships are verified.",
  },
  {
    id: "ke-mombasa",
    territoryName: "Mombasa Coastal Region",
    countryCode: "KE",
    countryName: "Kenya",
    tier: "tier_2_seeded",
    tierLabel: "Tier 2: Concierge Seed Target",
    densityScore: 68,
    verifiedArtisanCount: 12,
    activeMerchantNodes: 4,
    partnerAssociation:
      "Kenya Association of Building & Civil Engineering (KABCEC)",
    partnerAcronym: "KABCEC",
    partnerVerified: false,
    dispatchGuaranteedHours: 4,
    escrowSupport: "assisted_concierge",
    description: "Concierge-first target for coastal construction specialists.",
  },
  {
    id: "gh-kumasi",
    territoryName: "Kumasi Metropolitan",
    countryCode: "GH",
    countryName: "Ghana",
    tier: "tier_2_seeded",
    tierLabel: "Tier 2: Concierge Seed Target",
    densityScore: 65,
    verifiedArtisanCount: 10,
    activeMerchantNodes: 3,
    partnerAssociation: "Association of Ghana Industries - Construction Sector",
    partnerAcronym: "AGI",
    partnerVerified: false,
    dispatchGuaranteedHours: 4,
    escrowSupport: "assisted_concierge",
    description:
      "Concierge-first target; no live supply guarantee until a local network is confirmed.",
  },
  {
    id: "rw-kigali",
    territoryName: "Kigali Urban Core",
    countryCode: "RW",
    countryName: "Rwanda",
    tier: "tier_2_seeded",
    tierLabel: "Tier 2: Concierge Seed Target",
    densityScore: 70,
    verifiedArtisanCount: 14,
    activeMerchantNodes: 4,
    partnerAssociation: "Institution of Engineers Rwanda (IER)",
    partnerAcronym: "IER",
    partnerVerified: false,
    dispatchGuaranteedHours: 4,
    escrowSupport: "assisted_concierge",
    description:
      "Concierge-first target pending verified partners and suppliers.",
  },
  {
    id: "us-atlanta",
    territoryName: "Metro Atlanta",
    countryCode: "US",
    countryName: "United States",
    tier: "tier_1_active",
    tierLabel: "Tier 1: Active Liquidity Target",
    densityScore: 92,
    verifiedArtisanCount: 34,
    activeMerchantNodes: 12,
    partnerAssociation: "Associated General Contractors of America (AGC)",
    partnerAcronym: "AGC",
    partnerVerified: false,
    dispatchGuaranteedHours: 1,
    escrowSupport: "instant_self_serve",
    description:
      "Target US hub for CSI MasterFormat BOQ workflows. Network figures are not verified live data.",
  },
  {
    id: "emerging-default",
    territoryName: "Emerging & Rural Municipalities",
    countryCode: "GLOBAL",
    countryName: "Global Emerging Territories",
    tier: "tier_3_emerging",
    tierLabel: "Tier 3: Nomination & Waitlist",
    densityScore: 24,
    verifiedArtisanCount: 0,
    activeMerchantNodes: 0,
    partnerAssociation: "No verified local partner",
    partnerAcronym: "—",
    partnerVerified: false,
    dispatchGuaranteedHours: 24,
    escrowSupport: "on_demand_nomination",
    description:
      "Do not promise immediate supply. Collect a request or nominated contractor for manual follow-up.",
  },
];

export interface ConciergeSourcingRequest {
  id: string;
  clientName: string;
  clientEmail: string;
  territoryName: string;
  tradeNeeded: string;
  projectBudgetEstimate: string;
  escrowRequired: boolean;
  status: "received" | "guild_dispatched" | "matched";
  submittedAt: string;
}
export interface ArtisanNominationRequest {
  id: string;
  clientEmail: string;
  artisanName: string;
  artisanPhone: string;
  artisanTrade: string;
  locationCity: string;
  escrowContractRef?: string;
  verificationStatus: "pending_kyc" | "guild_vetting" | "cleared_for_escrow";
  submittedAt: string;
}

export function getTerritoryLiquidity(
  query?: string,
): TerritoryLiquidityProfile {
  if (!query?.trim()) return LAUNCH_TERRITORIES[0];
  const q = query.toLowerCase();
  const found = LAUNCH_TERRITORIES.find(
    (t) =>
      t.territoryName.toLowerCase().includes(q) ||
      t.countryName.toLowerCase().includes(q) ||
      t.countryCode.toLowerCase() === q ||
      t.id.toLowerCase().includes(q),
  );
  if (found) return found;
  return {
    ...LAUNCH_TERRITORIES[LAUNCH_TERRITORIES.length - 1],
    territoryName: `${query} (Emerging Territory)`,
  };
}

/**
 * Server submission. These used to write to localStorage, which meant a
 * request lived only in the visitor's browser and no member of staff could
 * ever act on it. Rows now land in marketplace_concierge_requests /
 * marketplace_artisan_nominations, readable by staff and by the submitter.
 */
export async function submitConciergeRequest(
  input: Omit<ConciergeSourcingRequest, "id" | "status" | "submittedAt">,
): Promise<ConciergeSourcingRequest> {
  const localRef = `cnc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const { data: authUser } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("marketplace_concierge_requests")
    .insert({
      local_ref: localRef,
      client_name: input.clientName,
      client_email: input.clientEmail,
      territory_name: input.territoryName,
      trade_needed: input.tradeNeeded,
      project_budget_estimate: input.projectBudgetEstimate,
      escrow_required: input.escrowRequired,
      status: "received",
      created_by: authUser?.user?.id ?? null,
    });
  if (error) throw error;
  return {
    ...input,
    id: localRef,
    status: "received",
    submittedAt: new Date().toISOString(),
  };
}

export async function nominateArtisanForEscrow(
  input: Omit<
    ArtisanNominationRequest,
    "id" | "verificationStatus" | "submittedAt"
  >,
): Promise<ArtisanNominationRequest> {
  const localRef = `nom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const { data: authUser } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("marketplace_artisan_nominations")
    .insert({
      local_ref: localRef,
      client_email: input.clientEmail,
      artisan_name: input.artisanName,
      artisan_phone: input.artisanPhone,
      artisan_trade: input.artisanTrade,
      location_city: input.locationCity,
      escrow_contract_ref: input.escrowContractRef ?? null,
      verification_status: "pending_kyc",
      created_by: authUser?.user?.id ?? null,
    });
  if (error) throw error;
  return {
    ...input,
    id: localRef,
    verificationStatus: "pending_kyc",
    submittedAt: new Date().toISOString(),
  };
}

/** The submitter's own saved requests (staff see everything). */
export async function listSavedConciergeRequests(): Promise<
  ConciergeSourcingRequest[]
> {
  const { data, error } = await supabase
    .from("marketplace_concierge_requests")
    .select(
      "local_ref, client_name, client_email, territory_name, trade_needed, project_budget_estimate, escrow_required, status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.local_ref ?? row.territory_name,
    clientName: row.client_name,
    clientEmail: row.client_email,
    territoryName: row.territory_name,
    tradeNeeded: row.trade_needed ?? "",
    projectBudgetEstimate: row.project_budget_estimate ?? "",
    escrowRequired: row.escrow_required,
    status: row.status as ConciergeSourcingRequest["status"],
    submittedAt: row.created_at,
  }));
}

export async function listSavedArtisanNominations(): Promise<
  ArtisanNominationRequest[]
> {
  const { data, error } = await supabase
    .from("marketplace_artisan_nominations")
    .select(
      "local_ref, client_email, artisan_name, artisan_phone, artisan_trade, location_city, escrow_contract_ref, verification_status, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.local_ref ?? row.artisan_name,
    clientEmail: row.client_email,
    artisanName: row.artisan_name,
    artisanPhone: row.artisan_phone,
    artisanTrade: row.artisan_trade ?? "",
    locationCity: row.location_city ?? "",
    escrowContractRef: row.escrow_contract_ref ?? undefined,
    verificationStatus:
      row.verification_status as ArtisanNominationRequest["verificationStatus"],
    submittedAt: row.created_at,
  }));
}

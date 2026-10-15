/**
 * Marketplace Liquidity & Strategic Seeding Protocol
 *
 * Provides territory density gating, cold-start liquidity tiers,
 * accredited trade association seeding partnerships, and concierge dispatch.
 * Partner and capacity figures are demonstration targets and MUST NOT be presented as verified real-world affiliations.
 */

export type LiquidityTier = 'tier_1_active' | 'tier_2_seeded' | 'tier_3_emerging';

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
  escrowSupport: 'instant_self_serve' | 'assisted_concierge' | 'on_demand_nomination';
  description: string;
}

export const LAUNCH_TERRITORIES: TerritoryLiquidityProfile[] = [
  { id: 'ng-lagos', territoryName: 'Lagos Metropolitan', countryCode: 'NG', countryName: 'Nigeria', tier: 'tier_1_active', tierLabel: 'Tier 1: Active Liquidity Target', densityScore: 94, verifiedArtisanCount: 42, activeMerchantNodes: 14, partnerAssociation: 'Nigerian Institute of Building (NIOB)', partnerAcronym: 'NIOB', partnerVerified: false, dispatchGuaranteedHours: 1, escrowSupport: 'instant_self_serve', description: 'Target launch hub for high-density coverage. Partner and capacity figures are unverified planning targets.' },
  { id: 'ke-nairobi', territoryName: 'Nairobi Urban Core', countryCode: 'KE', countryName: 'Kenya', tier: 'tier_1_active', tierLabel: 'Tier 1: Active Liquidity Target', densityScore: 91, verifiedArtisanCount: 38, activeMerchantNodes: 11, partnerAssociation: 'Architectural Association of Kenya (AAK)', partnerAcronym: 'AAK', partnerVerified: false, dispatchGuaranteedHours: 1, escrowSupport: 'instant_self_serve', description: 'Target launch hub. Local partner and verified network availability must be confirmed before enabling live services.' },
  { id: 'gh-accra', territoryName: 'Greater Accra', countryCode: 'GH', countryName: 'Ghana', tier: 'tier_1_active', tierLabel: 'Tier 1: Active Liquidity Target', densityScore: 88, verifiedArtisanCount: 29, activeMerchantNodes: 8, partnerAssociation: 'Ghana Institution of Engineering (GhIE)', partnerAcronym: 'GhIE', partnerVerified: false, dispatchGuaranteedHours: 2, escrowSupport: 'instant_self_serve', description: 'Target launch hub. Network counts are illustrative targets, not live inventory.' },
  { id: 'gb-london', territoryName: 'Greater London & Home Counties', countryCode: 'GB', countryName: 'United Kingdom', tier: 'tier_1_active', tierLabel: 'Tier 1: Active Liquidity Target', densityScore: 96, verifiedArtisanCount: 55, activeMerchantNodes: 20, partnerAssociation: 'Royal Institution of Chartered Surveyors (RICS)', partnerAcronym: 'RICS', partnerVerified: false, dispatchGuaranteedHours: 1, escrowSupport: 'instant_self_serve', description: 'Target UK hub for professional quantity surveying and regionalized BOQ exports.' },
  { id: 'ng-abuja', territoryName: 'Abuja Federal Capital', countryCode: 'NG', countryName: 'Nigeria', tier: 'tier_2_seeded', tierLabel: 'Tier 2: Concierge Seed Target', densityScore: 72, verifiedArtisanCount: 16, activeMerchantNodes: 5, partnerAssociation: 'Federation of Construction Industry (FOCI)', partnerAcronym: 'FOCI', partnerVerified: false, dispatchGuaranteedHours: 4, escrowSupport: 'assisted_concierge', description: 'Concierge-first territory until real local capacity and partnerships are verified.' },
  { id: 'ke-mombasa', territoryName: 'Mombasa Coastal Region', countryCode: 'KE', countryName: 'Kenya', tier: 'tier_2_seeded', tierLabel: 'Tier 2: Concierge Seed Target', densityScore: 68, verifiedArtisanCount: 12, activeMerchantNodes: 4, partnerAssociation: 'Kenya Association of Building & Civil Engineering (KABCEC)', partnerAcronym: 'KABCEC', partnerVerified: false, dispatchGuaranteedHours: 4, escrowSupport: 'assisted_concierge', description: 'Concierge-first target for coastal construction specialists.' },
  { id: 'gh-kumasi', territoryName: 'Kumasi Metropolitan', countryCode: 'GH', countryName: 'Ghana', tier: 'tier_2_seeded', tierLabel: 'Tier 2: Concierge Seed Target', densityScore: 65, verifiedArtisanCount: 10, activeMerchantNodes: 3, partnerAssociation: 'Association of Ghana Industries - Construction Sector', partnerAcronym: 'AGI', partnerVerified: false, dispatchGuaranteedHours: 4, escrowSupport: 'assisted_concierge', description: 'Concierge-first target; no live supply guarantee until a local network is confirmed.' },
  { id: 'rw-kigali', territoryName: 'Kigali Urban Core', countryCode: 'RW', countryName: 'Rwanda', tier: 'tier_2_seeded', tierLabel: 'Tier 2: Concierge Seed Target', densityScore: 70, verifiedArtisanCount: 14, activeMerchantNodes: 4, partnerAssociation: 'Institution of Engineers Rwanda (IER)', partnerAcronym: 'IER', partnerVerified: false, dispatchGuaranteedHours: 4, escrowSupport: 'assisted_concierge', description: 'Concierge-first target pending verified partners and suppliers.' },
  { id: 'us-atlanta', territoryName: 'Metro Atlanta', countryCode: 'US', countryName: 'United States', tier: 'tier_1_active', tierLabel: 'Tier 1: Active Liquidity Target', densityScore: 92, verifiedArtisanCount: 34, activeMerchantNodes: 12, partnerAssociation: 'Associated General Contractors of America (AGC)', partnerAcronym: 'AGC', partnerVerified: false, dispatchGuaranteedHours: 1, escrowSupport: 'instant_self_serve', description: 'Target US hub for CSI MasterFormat BOQ workflows. Network figures are not verified live data.' },
  { id: 'emerging-default', territoryName: 'Emerging & Rural Municipalities', countryCode: 'GLOBAL', countryName: 'Global Emerging Territories', tier: 'tier_3_emerging', tierLabel: 'Tier 3: Nomination & Waitlist', densityScore: 24, verifiedArtisanCount: 0, activeMerchantNodes: 0, partnerAssociation: 'No verified local partner', partnerAcronym: '—', partnerVerified: false, dispatchGuaranteedHours: 24, escrowSupport: 'on_demand_nomination', description: 'Do not promise immediate supply. Collect a request or nominated contractor for manual follow-up.' },
];

export interface ConciergeSourcingRequest {
  id: string; clientName: string; clientEmail: string; territoryName: string; tradeNeeded: string;
  projectBudgetEstimate: string; escrowRequired: boolean; status: 'received' | 'guild_dispatched' | 'matched'; submittedAt: string;
}
export interface ArtisanNominationRequest {
  id: string; clientEmail: string; artisanName: string; artisanPhone: string; artisanTrade: string;
  locationCity: string; escrowContractRef?: string; verificationStatus: 'pending_kyc' | 'guild_vetting' | 'cleared_for_escrow'; submittedAt: string;
}
const CONCIERGE_STORAGE_KEY = 'frelux_concierge_requests';
const NOMINATION_STORAGE_KEY = 'frelux_artisan_nominations';

export function getTerritoryLiquidity(query?: string): TerritoryLiquidityProfile {
  if (!query?.trim()) return LAUNCH_TERRITORIES[0];
  const q = query.toLowerCase();
  const found = LAUNCH_TERRITORIES.find(t => t.territoryName.toLowerCase().includes(q) || t.countryName.toLowerCase().includes(q) || t.countryCode.toLowerCase() === q || t.id.toLowerCase().includes(q));
  if (found) return found;
  return { ...LAUNCH_TERRITORIES[LAUNCH_TERRITORIES.length - 1], territoryName: `${query} (Emerging Territory)` };
}

export function submitConciergeRequest(input: Omit<ConciergeSourcingRequest, 'id' | 'status' | 'submittedAt'>): ConciergeSourcingRequest {
  const req: ConciergeSourcingRequest = { ...input, id: `cnc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, status: 'received', submittedAt: new Date().toISOString() };
  try { if (typeof localStorage !== 'undefined') { const raw = localStorage.getItem(CONCIERGE_STORAGE_KEY); const list: ConciergeSourcingRequest[] = raw ? JSON.parse(raw) : []; list.push(req); localStorage.setItem(CONCIERGE_STORAGE_KEY, JSON.stringify(list)); } } catch { /* best effort; not server submission */ }
  return req;
}
export function nominateArtisanForEscrow(input: Omit<ArtisanNominationRequest, 'id' | 'verificationStatus' | 'submittedAt'>): ArtisanNominationRequest {
  const nom: ArtisanNominationRequest = { ...input, id: `nom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`, verificationStatus: 'pending_kyc', submittedAt: new Date().toISOString() };
  try { if (typeof localStorage !== 'undefined') { const raw = localStorage.getItem(NOMINATION_STORAGE_KEY); const list: ArtisanNominationRequest[] = raw ? JSON.parse(raw) : []; list.push(nom); localStorage.setItem(NOMINATION_STORAGE_KEY, JSON.stringify(list)); } } catch { /* best effort; not server submission */ }
  return nom;
}
export function listSavedConciergeRequests(): ConciergeSourcingRequest[] {
  try { if (typeof localStorage === 'undefined') return []; const raw = localStorage.getItem(CONCIERGE_STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}
export function listSavedArtisanNominations(): ArtisanNominationRequest[] {
  try { if (typeof localStorage === 'undefined') return []; const raw = localStorage.getItem(NOMINATION_STORAGE_KEY); return raw ? JSON.parse(raw) : []; } catch { return []; }
}

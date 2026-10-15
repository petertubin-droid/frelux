import { describe, it, expect, beforeEach } from 'vitest';
import {
  LAUNCH_TERRITORIES,
  getTerritoryLiquidity,
  submitConciergeRequest,
  nominateArtisanForEscrow,
  listSavedConciergeRequests,
  listSavedArtisanNominations,
} from './liquidity-seeding-protocol';

describe('Marketplace Liquidity & Strategic Seeding Protocol', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('provides designated seed launch territories with tiers and partner affiliations', () => {
    expect(LAUNCH_TERRITORIES.length).toBeGreaterThan(5);
    const lagos = LAUNCH_TERRITORIES.find((t) => t.id === 'ng-lagos')!;
    expect(lagos.tier).toBe('tier_1_active');
    expect(lagos.densityScore).toBeGreaterThanOrEqual(90);

    const abuja = LAUNCH_TERRITORIES.find((t) => t.id === 'ng-abuja')!;
    expect(abuja.tier).toBe('tier_2_seeded');
    expect(abuja.dispatchGuaranteedHours).toBe(4);
  });

  it('resolves territory liquidity accurately from search queries', () => {
    const r1 = getTerritoryLiquidity('Lagos');
    expect(r1.id).toBe('ng-lagos');

    const r2 = getTerritoryLiquidity('Nairobi');
    expect(r2.id).toBe('ke-nairobi');

    const r3 = getTerritoryLiquidity('Remote Mountain Village');
    expect(r3.tier).toBe('tier_3_emerging');
    expect(r3.territoryName).toContain('Remote Mountain Village');
  });

  it('records concierge sourcing requests for low-density areas', () => {
    const req = submitConciergeRequest({
      clientName: 'Sarah Jenkins',
      clientEmail: 'sarah@globaldev.com',
      territoryName: 'Kumasi Metropolitan',
      tradeNeeded: 'Structural Steel & Rebar',
      projectBudgetEstimate: '$45,000 USD',
      escrowRequired: true,
    });

    expect(req.id).toMatch(/^cnc_/);
    expect(req.status).toBe('received');

    const list = listSavedConciergeRequests();
    expect(list.length).toBe(1);
    expect(list[0].clientName).toBe('Sarah Jenkins');
  });

  it('processes artisan nominations for 24h fast-track escrow onboarding', () => {
    const nom = nominateArtisanForEscrow({
      clientEmail: 'diaspora.investor@gmail.com',
      artisanName: 'Emmanuel Adeyemi',
      artisanPhone: '+234 803 123 4567',
      artisanTrade: 'Master Mason / Bricklayer',
      locationCity: 'Ibadan, Oyo State',
      escrowContractRef: 'ESCROW-2026-901',
    });

    expect(nom.id).toMatch(/^nom_/);
    expect(nom.verificationStatus).toBe('pending_kyc');

    const list = listSavedArtisanNominations();
    expect(list.length).toBe(1);
    expect(list[0].artisanName).toBe('Emmanuel Adeyemi');
  });
});

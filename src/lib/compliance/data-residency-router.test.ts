import { describe, it, expect, beforeEach } from 'vitest';
import {
  REGIONAL_ENDPOINTS,
  detectRecommendedRegion,
  getActiveResidencyProfile,
  saveResidencyProfile,
  auditCrossBorderTransfer,
  executeRightToBeForgotten,
  generateMachineReadableExport,
} from './data-residency-router';

describe('Data Residency & Multi-Jurisdictional Router', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('provides configuration for all enterprise regions', () => {
    expect(REGIONAL_ENDPOINTS['eu-central-1'].strictResidencyEnforced).toBe(true);
    expect(REGIONAL_ENDPOINTS['us-west-2'].jurisdiction).toContain('California');
    expect(REGIONAL_ENDPOINTS['af-south-1'].regionName).toContain('Africa');
    expect(REGIONAL_ENDPOINTS['eu-west-2'].governingLaw).toContain('UK-GDPR');
  });

  it('accurately detects recommended regional endpoints from ISO country codes', () => {
    expect(detectRecommendedRegion('DE')).toBe('eu-central-1');
    expect(detectRecommendedRegion('GB')).toBe('eu-west-2');
    expect(detectRecommendedRegion('US')).toBe('us-west-2');
    expect(detectRecommendedRegion('NG')).toBe('af-south-1');
    expect(detectRecommendedRegion('KE')).toBe('af-south-1');
    expect(detectRecommendedRegion('SG')).toBe('ap-southeast-1');
  });

  it('manages residency profile persistence and updates', () => {
    const initial = getActiveResidencyProfile();
    expect(initial.assignedRegion).toBe('eu-central-1');

    const updated = saveResidencyProfile({
      assignedRegion: 'af-south-1',
      doNotSellOrShare: true,
    });
    expect(updated.assignedRegion).toBe('af-south-1');
    expect(getActiveResidencyProfile().assignedRegion).toBe('af-south-1');
  });

  it('audits intra-region and cross-border transfers accurately', () => {
    const intra = auditCrossBorderTransfer('eu-central-1', 'eu-central-1');
    expect(intra.allowed).toBe(true);
    expect(intra.requiresSCC).toBe(false);

    const crossBorder = auditCrossBorderTransfer('eu-central-1', 'us-west-2');
    expect(crossBorder.allowed).toBe(true);
    expect(crossBorder.requiresSCC).toBe(true);
    expect(crossBorder.disclosure).toContain('Standard Contractual Clauses');
  });

  it('executes Right to be Forgotten protocol with confirmation token and purges local traces', () => {
    localStorage.setItem('frelux_calc_draft', '{"amount": 100}');
    const result = executeRightToBeForgotten('user@example.com');

    expect(result.success).toBe(true);
    expect(result.confirmationToken).toMatch(/^RTBF-/);
    expect(localStorage.getItem('frelux_calc_draft')).toBeNull();
  });

  it('generates machine-readable structured portability export', () => {
    const exp = generateMachineReadableExport();
    expect(exp.exportVersion).toBe('2.0.0-enterprise');
    expect(exp.dataSubject).toBeDefined();
    expect((exp.records as any).estimates).toBeInstanceOf(Array);
  });
});

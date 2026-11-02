import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: {},
  isSupabaseConfigured: false,
}));

vi.mock('@/lib/credits', () => ({
  getAiFeatureCost: vi.fn().mockResolvedValue(null),
  spendAiCredits: vi.fn().mockResolvedValue({ success: false }),
  unlockFeatureViaAd: vi.fn().mockResolvedValue({ success: false }),
  generateReferenceId: vi.fn().mockReturnValue('ref-123'),
}));

const { checkAndSpendCredits, unlockViaAd } = await import('./ai-credit-gate');

describe('ai-credit-gate', () => {
  it('checkAndSpendCredits returns allowed=true when feature not configured', async () => {
    const result = await checkAndSpendCredits('ai_photo_estimator');
    expect(result.allowed).toBe(true);
  });

  it('unlockViaAd returns success=false when feature not configured', async () => {
    const result = await unlockViaAd('ai_photo_estimator', 'test-ad-provider', 'test-ad-id');
    expect(result.success).toBe(false);
  });
});

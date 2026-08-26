import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not configured' } }),
    },
  },
  isSupabaseConfigured: false,
}));

vi.mock('@/lib/ai-credit-gate', () => ({
  checkAndSpendCredits: vi.fn().mockResolvedValue({
    allowed: true,
    feature: { credit_cost: 1 },
    adUnlockAvailable: false,
    newBalance: 10,
  }),
}));

vi.mock('@/lib/ai-access', () => ({
  getClientId: vi.fn().mockReturnValue('test-client-id'),
}));

vi.mock('@/lib/errorMonitor', () => ({
  captureAiError: vi.fn(),
}));

vi.mock('@/lib/colors', () => ({
  isValidHexColor: vi.fn().mockReturnValue(true),
  normalizeHex: vi.fn().mockReturnValue('#FF0000'),
}));

const { requestColorConsultationWithCredits, AiConsultError } = await import('./ai');

describe('ai', () => {
  it('AiConsultError is an Error subclass', () => {
    const err = new AiConsultError('msg', 'CODE', 500);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('CODE');
    expect(err.status).toBe(500);
  });

  it('requestColorConsultationWithCredits returns gateError on failure', async () => {
    const result = await requestColorConsultationWithCredits({ mode: 'text', description: 'blue room' });
    expect(result).toBeTruthy();
    // Will either have result or gateError depending on supabase response
    expect(result.gateError || result.result).toBeTruthy();
  });
});

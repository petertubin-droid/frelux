import { describe, it, expect, vi } from 'vitest';

vi.mock('./supabase', () => ({
  supabase: {
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not configured' } }) },
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn(),
    }),
  },
  isSupabaseConfigured: false,
}));

const { invokeStudioAi, StudioAiError } = await import('./ai-studio');

describe('ai-studio (supabase not configured)', () => {
  it('StudioAiError is an Error subclass', () => {
    const err = new StudioAiError('msg', 'CODE', 500);
    expect(err).toBeInstanceOf(Error);
    expect(err.code).toBe('CODE');
  });

  it('invokeStudioAi throws when not configured', async () => {
    await expect(invokeStudioAi({} as any)).rejects.toThrow();
  });
});

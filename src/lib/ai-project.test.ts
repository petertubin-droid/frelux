import { describe, it, expect, vi } from 'vitest';

vi.mock('./supabase', () => ({
  supabase: {
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not configured' } }),
    },
  },
  isSupabaseConfigured: false,
}));

const { aiProjectReview, aiProjectOptimize, aiProjectExplain, aiProjectQa } = await import('./ai-project');

describe('ai-project (supabase not configured)', () => {
  it('aiProjectReview throws when not configured', async () => {
    await expect(aiProjectReview({} as any)).rejects.toThrow();
  });

  it('aiProjectOptimize throws when not configured', async () => {
    await expect(aiProjectOptimize({} as any, 'reduce cost')).rejects.toThrow();
  });

  it('aiProjectExplain throws when not configured', async () => {
    await expect(aiProjectExplain({} as any)).rejects.toThrow();
  });

  it('aiProjectQa throws when not configured', async () => {
    await expect(aiProjectQa({} as any, 'what is this?')).rejects.toThrow();
  });
});

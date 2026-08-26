import { describe, it, expect, vi } from 'vitest';

function createChainable() {
  const chain: any = {
    single: vi.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    then: vi.fn((resolve: any) => Promise.resolve({ data: [], error: null, count: 0 }).then(resolve)),
  };
  const proxy = new Proxy(chain, {
    get(target: any, prop: string) {
      if (prop in target) return target[prop];
      if (prop === 'then') return target.then;
      target[prop] = vi.fn().mockReturnValue(proxy);
      return target[prop];
    },
  });
  return proxy;
}

vi.mock('@/lib/supabase', () => ({
  supabase: {
    from: vi.fn().mockReturnValue(createChainable()),
    functions: { invoke: vi.fn().mockResolvedValue({ data: null, error: null }) },
  },
  isSupabaseConfigured: false,
}));

const { toggleFavorite, isFavorited, fetchFavorites, fetchFavoriteIds, fetchReviews, fetchReviewStats } = await import('./marketplace-expansion');

describe('marketplace-expansion (supabase not configured)', () => {
  it('toggleFavorite returns true (adds new favorite)', async () => {
    const result = await toggleFavorite('user1', 'listing', 'id1');
    expect(result).toBe(true);
  });

  it('isFavorited returns false when not found', async () => {
    expect(await isFavorited('user1', 'listing', 'id1')).toBe(false);
  });

  it('fetchFavorites returns array', async () => {
    expect(await fetchFavorites('user1')).toEqual([]);
  });

  it('fetchFavoriteIds returns empty set', async () => {
    const result = await fetchFavoriteIds('user1', 'listing');
    expect(result).toBeInstanceOf(Set);
    expect(result.size).toBe(0);
  });

  it('fetchReviews returns { reviews, total }', async () => {
    const result = await fetchReviews({} as any);
    expect(result).toBeTruthy();
    expect(result.reviews).toEqual([]);
    expect(result.total).toBe(0);
  });

  it('fetchReviewStats returns stats object', async () => {
    const stats = await fetchReviewStats({ type: 'listing' as any, id: 'id1' });
    expect(stats).toBeTruthy();
  });
});

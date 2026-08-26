import { describe, it, expect, vi } from 'vitest';

vi.mock('@/lib/supabase', () => ({
  supabase: {},
  isSupabaseConfigured: false,
}));

const { findNearbyProfessionals, findNearbyListings } = await import('./location-discovery');

describe('location-discovery (supabase not configured)', () => {
  it('findNearbyProfessionals returns empty array', async () => {
    const result = await findNearbyProfessionals({ lat: 6.5, lon: 3.4, radiusKm: 10 } as any);
    expect(result).toEqual([]);
  });

  it('findNearbyListings returns empty array', async () => {
    const result = await findNearbyListings({ lat: 6.5, lon: 3.4, radiusKm: 10 } as any);
    expect(result).toEqual([]);
  });
});

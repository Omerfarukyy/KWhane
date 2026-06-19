import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  post: vi.fn(),
  from: vi.fn(),
}));

vi.mock('axios', () => ({
  default: { create: () => ({ post: mocks.post }) },
}));

vi.mock('../../lib/supabase', () => ({
  supabase: { from: mocks.from },
}));

import { runFullAnalysis } from '../../services/mlService';

describe('runFullAnalysis recommendation persistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.post.mockImplementation((path) => {
      if (path === '/calculate') return Promise.resolve({ data: { monthly_kwh: 10 } });
      if (path === '/compare') return Promise.resolve({ data: null });
      if (path === '/savings') return Promise.resolve({ data: { recommendations: [] } });
      return Promise.reject(new Error(`unexpected path: ${path}`));
    });
  });

  it('deletes stale recommendations when a successful analysis returns none', async () => {
    const recommendationsQuery = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    mocks.from.mockImplementation((table) => {
      if (table === 'recommendations') return recommendationsQuery;
      throw new Error(`unexpected table: ${table}`);
    });

    await runFullAnalysis('device-1', {
      room_id: 'room-1',
      name: 'TV',
      type: 'tv',
      nominal_power_watts: 100,
      daily_usage_hours: 5,
      standby_power_watts: 2,
      efficiency_class: 'A+',
      year_of_purchase: 2026,
    }, 'user-1');

    expect(recommendationsQuery.delete).toHaveBeenCalledOnce();
    expect(recommendationsQuery.eq).toHaveBeenCalledWith('device_id', 'device-1');
    expect(recommendationsQuery.insert).not.toHaveBeenCalled();
  });
});

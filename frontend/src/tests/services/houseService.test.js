import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('../../lib/supabase', () => ({
  supabase: { from: mocks.from },
}));

import { deleteDevice } from '../../services/houseService';

describe('deleteDevice', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('explicitly removes recommendations when deleting the device', async () => {
    const queries = new Map();
    mocks.from.mockImplementation((table) => {
      const query = {
        delete: vi.fn().mockReturnThis(),
        eq: vi.fn().mockResolvedValue({ error: null }),
      };
      queries.set(table, query);
      return query;
    });

    await deleteDevice('device-1');

    expect(queries.get('devices').eq).toHaveBeenCalledWith('id', 'device-1');
    expect(queries.get('recommendations').eq).toHaveBeenCalledWith('device_id', 'device-1');
  });
});

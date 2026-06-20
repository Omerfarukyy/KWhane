import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));

vi.mock('axios', () => ({ default: { post: vi.fn() } }));
vi.mock('../../lib/supabase', () => ({ supabase: { from: mocks.from } }));

import {
  applyBillingScale,
  applyEfficiencyCalibration,
  clearBillingScale,
  updateGeneratedClassName,
} from '../../services/calibrationService';

const updateQuery = () => ({
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockResolvedValue({ error: null }),
});

describe('calibrationService', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('updates generated class names but preserves custom names', () => {
    expect(updateGeneratedClassName('A Sınıfı Buzdolabı', 'A', 'E')).toBe('E Sınıfı Buzdolabı');
    expect(updateGeneratedClassName('Class A Fridge', 'A', 'E')).toBe('Class E Fridge');
    expect(updateGeneratedClassName('Mutfaktaki dolap', 'A', 'E')).toBe('Mutfaktaki dolap');
  });

  it('persists the efficiency class and generated device name', async () => {
    const query = updateQuery();
    mocks.from.mockReturnValue(query);

    const result = await applyEfficiencyCalibration({
      deviceId: 'device-1',
      fromClass: 'A',
      toClass: 'E',
      currentName: 'A Sınıfı Buzdolabı',
    });

    expect(query.update).toHaveBeenCalledWith({
      efficiency_class: 'E',
      name: 'E Sınıfı Buzdolabı',
    });
    expect(query.eq).toHaveBeenCalledWith('id', 'device-1');
    expect(result.name).toBe('E Sınıfı Buzdolabı');
  });

  it('stores and clears all billing-scale metadata', async () => {
    const saveQuery = updateQuery();
    const clearQuery = updateQuery();
    mocks.from.mockReturnValueOnce(saveQuery).mockReturnValueOnce(clearQuery);

    await applyBillingScale({
      homeId: 'home-1',
      scaleFactor: 1.25,
      billCount: 3,
      actualKwh: 250,
      predictedKwh: 200,
    });
    await clearBillingScale({ homeId: 'home-1' });

    expect(saveQuery.update).toHaveBeenCalledWith(expect.objectContaining({
      billing_scale_factor: 1.25,
      billing_scale_bill_count: 3,
      billing_scale_actual_kwh: 250,
      billing_scale_predicted_kwh: 200,
    }));
    expect(clearQuery.update).toHaveBeenCalledWith({
      billing_scale_factor: null,
      billing_scale_bill_count: null,
      billing_scale_actual_kwh: null,
      billing_scale_predicted_kwh: null,
      billing_scale_updated_at: null,
    });
  });
});

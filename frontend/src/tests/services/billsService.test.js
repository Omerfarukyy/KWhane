import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock supabase before importing the service
vi.mock('../../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
    auth: { getSession: vi.fn(), onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
  },
}));

vi.mock('axios', () => ({
  default: { post: vi.fn() },
}));

import { insertBill, deleteBill, getBillSummary, cacheDiagnosticSummary, readCachedDiagnosticSummary } from '../../services/billsService';
import { supabase } from '../../lib/supabase';
import { cacheDeletePrefix } from '../../lib/cache';

const mockChain = (returnValue) => {
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(returnValue),
    insert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    single: vi.fn().mockResolvedValue(returnValue),
  };
  return chain;
};

describe('getBillSummary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cacheDeletePrefix('bills:');
  });

  it('returns zero summary when userId is missing', async () => {
    const result = await getBillSummary(null);
    expect(result.billCount).toBe(0);
    expect(result.avgMonthlyKwh).toBeNull();
  });

  it('returns zero summary when no bills exist', async () => {
    supabase.from.mockReturnValue(mockChain({ data: [], error: null }));
    const result = await getBillSummary('user-1');
    expect(result.billCount).toBe(0);
  });

  it('calculates correct averages from bills', async () => {
    const bills = [
      { total_kwh: 300, total_cost_tl: 900 },
      { total_kwh: 200, total_cost_tl: 600 },
    ];
    supabase.from.mockReturnValue(mockChain({ data: bills, error: null }));
    const result = await getBillSummary('user-1');
    expect(result.billCount).toBe(2);
    expect(result.avgMonthlyKwh).toBe(250);
    expect(result.avgMonthlyCost).toBe(750);
    expect(result.effectiveTariffTlPerKwh).toBe(3);
  });

  it('returns null tariff when total kWh is 0', async () => {
    supabase.from.mockReturnValue(mockChain({ data: [{ total_kwh: 0, total_cost_tl: 0 }], error: null }));
    const result = await getBillSummary('user-1');
    expect(result.effectiveTariffTlPerKwh).toBeNull();
  });

  it('returns empty array and zero summary on supabase error', async () => {
    supabase.from.mockReturnValue(mockChain({ data: null, error: { message: 'fail' } }));
    const result = await getBillSummary('user-1');
    expect(result.billCount).toBe(0);
  });
});

describe('cacheDiagnosticSummary / readCachedDiagnosticSummary', () => {
  beforeEach(() => { localStorage.clear(); });

  it('stores and retrieves a summary string', () => {
    cacheDiagnosticSummary('uid-1', 'test summary');
    expect(readCachedDiagnosticSummary('uid-1')).toBe('test summary');
  });

  it('returns null when nothing is cached', () => {
    expect(readCachedDiagnosticSummary('uid-999')).toBeNull();
  });

  it('does nothing when userId is null', () => {
    cacheDiagnosticSummary(null, 'data');
    expect(readCachedDiagnosticSummary(null)).toBeNull();
  });

  it('isolates cache per user id', () => {
    cacheDiagnosticSummary('uid-a', 'summary-a');
    cacheDiagnosticSummary('uid-b', 'summary-b');
    expect(readCachedDiagnosticSummary('uid-a')).toBe('summary-a');
    expect(readCachedDiagnosticSummary('uid-b')).toBe('summary-b');
  });
});

describe('bill change notifications', () => {
  it('notifies the dashboard after inserting or deleting a bill', async () => {
    const dispatchSpy = vi.spyOn(window, 'dispatchEvent');
    supabase.from
      .mockReturnValueOnce(mockChain({ data: { id: 'bill-1' }, error: null }))
      .mockReturnValueOnce(mockChain({ error: null }));

    await insertBill({
      userId: 'user-1',
      periodStart: '2026-01-01',
      periodEnd: '2026-01-31',
      totalKwh: 200,
      totalCostTl: 600,
    });
    await deleteBill('bill-1');

    const billEvents = dispatchSpy.mock.calls
      .map(([event]) => event.type)
      .filter((type) => type === 'bills-changed');
    expect(billEvents).toHaveLength(2);
    dispatchSpy.mockRestore();
  });
});

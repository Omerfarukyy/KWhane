import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

vi.mock('../../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
      signInWithPassword: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
  },
}));

vi.mock('../../services/billsService', () => ({
  listBills: vi.fn(),
  getBillSummary: vi.fn(),
  deleteBill: vi.fn(),
}));

vi.mock('../../store/useSceneStore', () => ({
  default: vi.fn((selector) => {
    const state = { setHomeBillValidated: vi.fn() };
    return selector(state);
  }),
}));

vi.mock('../../components/Dashboard/Bills/BillEntryModal', () => ({
  default: ({ isOpen }) => isOpen ? <div data-testid="bill-modal" /> : null,
}));

vi.mock('../../components/Dashboard/Bills/CalibrationCard', () => ({
  default: () => <div data-testid="calibration-card" />,
}));

import { listBills, getBillSummary, deleteBill } from '../../services/billsService';
import { LanguageProvider } from '../../contexts/LanguageProvider';
import BillsTab from '../../components/Dashboard/Bills/BillsTab';

const renderTab = (userId = 'user-1') =>
  render(<LanguageProvider><BillsTab userId={userId} /></LanguageProvider>);

describe('BillsTab', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows empty state when no bills exist', async () => {
    listBills.mockResolvedValue([]);
    getBillSummary.mockResolvedValue({ billCount: 0, avgMonthlyKwh: null, avgMonthlyCost: null, effectiveTariffTlPerKwh: null });
    renderTab();
    await waitFor(() =>
      expect(screen.getByText(/Henüz fatura eklenmemiş/)).toBeInTheDocument()
    );
  });

  it('renders bill list when bills exist', async () => {
    const bills = [{
      id: 'b1', total_cost_tl: 900, total_kwh: 300,
      period_start: '2024-01-01', period_end: '2024-01-31', provider: 'BEDAŞ',
    }];
    listBills.mockResolvedValue(bills);
    getBillSummary.mockResolvedValue({ billCount: 1, avgMonthlyKwh: 300, avgMonthlyCost: 900, effectiveTariffTlPerKwh: 3 });
    renderTab();
    await waitFor(() => expect(screen.getAllByText('₺900').length).toBeGreaterThanOrEqual(1));
    expect(screen.getByText(/BEDAŞ/)).toBeInTheDocument();
  });

  it('renders summary section when bills exist', async () => {
    listBills.mockResolvedValue([{ id: 'b1', total_cost_tl: 600, total_kwh: 200, period_start: '2024-01-01', period_end: '2024-01-31' }]);
    getBillSummary.mockResolvedValue({ billCount: 1, avgMonthlyKwh: 200, avgMonthlyCost: 600, effectiveTariffTlPerKwh: 3 });
    renderTab();
    await waitFor(() => expect(screen.getByText(/Son 1 faturanın/)).toBeInTheDocument());
    expect(screen.getAllByText(/₺600/).length).toBeGreaterThanOrEqual(1);
  });

  it('opens modal when Ekle button is clicked', async () => {
    listBills.mockResolvedValue([]);
    getBillSummary.mockResolvedValue({ billCount: 0, avgMonthlyKwh: null, avgMonthlyCost: null, effectiveTariffTlPerKwh: null });
    renderTab();
    await waitFor(() => screen.getByText('Ekle'));
    fireEvent.click(screen.getByText('Ekle'));
    expect(screen.getByTestId('bill-modal')).toBeInTheDocument();
  });

  it('deletes a bill optimistically and refreshes summary', async () => {
    const bills = [{ id: 'b1', total_cost_tl: 900, total_kwh: 300, period_start: '2024-01-01', period_end: '2024-01-31' }];
    listBills.mockResolvedValue(bills);
    getBillSummary.mockResolvedValue({ billCount: 1, avgMonthlyKwh: 300, avgMonthlyCost: 900, effectiveTariffTlPerKwh: 3 });
    deleteBill.mockResolvedValue({ ok: true });

    renderTab();
    await waitFor(() => screen.getByTitle('Faturayı sil'));
    fireEvent.click(screen.getByTitle('Faturayı sil'));

    await waitFor(() => expect(deleteBill).toHaveBeenCalledWith('b1'));
  });

  it('does not fetch when userId is not provided', () => {
    render(<LanguageProvider><BillsTab userId={undefined} /></LanguageProvider>);
    expect(listBills).not.toHaveBeenCalled();
  });

  it('shows CalibrationCard when summary has at least 1 bill', async () => {
    listBills.mockResolvedValue([{ id: 'b1', total_cost_tl: 900, total_kwh: 300, period_start: '2024-01-01', period_end: '2024-01-31' }]);
    getBillSummary.mockResolvedValue({ billCount: 1, avgMonthlyKwh: 300, avgMonthlyCost: 900, effectiveTariffTlPerKwh: 3 });
    renderTab();
    await waitFor(() => expect(screen.getByTestId('calibration-card')).toBeInTheDocument());
  });
});

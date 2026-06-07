import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';

vi.mock('../../services/peerComparisonService', () => ({
  fetchHomeComparison: vi.fn(),
  getHomeMeta: vi.fn(),
}));

vi.mock('../../services/billsService', () => ({
  getBillSummary: vi.fn(),
}));

import { fetchHomeComparison, getHomeMeta } from '../../services/peerComparisonService';
import { getBillSummary } from '../../services/billsService';
import { LanguageProvider } from '../../contexts/LanguageProvider';
import HomeRanking from '../../components/Dashboard/HomeRanking';

const renderRanking = (props = {}) =>
  render(<LanguageProvider><HomeRanking userId="user-1" predictedKwh={0} nDevices={0} {...props} /></LanguageProvider>);

const mockComparison = {
  percentile: 30,
  comparison_label: 'below_average',
  cluster_size: 12,
  user_monthly_kwh: 250,
  cluster_avg_monthly_kwh: 350,
  source: 'bill',
};

describe('HomeRanking', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('shows no-data message when no kWh source available', async () => {
    getBillSummary.mockResolvedValue({ avgMonthlyKwh: null });
    renderRanking({ predictedKwh: 0 });
    await waitFor(() =>
      expect(screen.getByText(/Henüz karşılaştırma verisi yok/)).toBeInTheDocument()
    );
  });

  it('renders percentile when data loads', async () => {
    getBillSummary.mockResolvedValue({ avgMonthlyKwh: 250 });
    getHomeMeta.mockResolvedValue({ city: 'Istanbul', occupants_count: 3, total_area_sqm: 90 });
    fetchHomeComparison.mockResolvedValue(mockComparison);
    renderRanking({ predictedKwh: 0 });
    await waitFor(() => expect(screen.getByText('%70')).toBeInTheDocument());
  });

  it('shows bill source pill when data comes from bills', async () => {
    getBillSummary.mockResolvedValue({ avgMonthlyKwh: 250 });
    getHomeMeta.mockResolvedValue({});
    fetchHomeComparison.mockResolvedValue(mockComparison);
    renderRanking();
    await waitFor(() => expect(screen.getByText('Faturanıza göre')).toBeInTheDocument());
  });

  it('shows predicted source pill when only predicted data available', async () => {
    getBillSummary.mockResolvedValue({ avgMonthlyKwh: null });
    getHomeMeta.mockResolvedValue({});
    fetchHomeComparison.mockResolvedValue({ ...mockComparison, source: 'predicted' });
    renderRanking({ predictedKwh: 300 });
    await waitFor(() => expect(screen.getByText('Tahmine göre')).toBeInTheDocument());
  });

  it('prefers bill kWh over predicted kWh', async () => {
    getBillSummary.mockResolvedValue({ avgMonthlyKwh: 200 });
    getHomeMeta.mockResolvedValue({});
    fetchHomeComparison.mockResolvedValue(mockComparison);
    renderRanking({ predictedKwh: 999 });
    await waitFor(() => expect(fetchHomeComparison).toHaveBeenCalledWith(
      expect.objectContaining({ monthlyKwh: 200, source: 'bill' })
    ));
  });

  it('shows error state when fetchHomeComparison returns null', async () => {
    getBillSummary.mockResolvedValue({ avgMonthlyKwh: 300 });
    getHomeMeta.mockResolvedValue({});
    fetchHomeComparison.mockResolvedValue(null);
    renderRanking();
    await waitFor(() =>
      expect(screen.getByText(/Sıralama hesaplanamadı/)).toBeInTheDocument()
    );
  });

  it('shows numeric breakdown grid with user / average / delta', async () => {
    getBillSummary.mockResolvedValue({ avgMonthlyKwh: 250 });
    getHomeMeta.mockResolvedValue({});
    fetchHomeComparison.mockResolvedValue(mockComparison);
    renderRanking();
    await waitFor(() => expect(screen.getByText('250')).toBeInTheDocument());
    expect(screen.getByText('350')).toBeInTheDocument();
  });
});

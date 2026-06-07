import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import TopStatsBar from '../../components/Dashboard/TopStatsBar';

describe('TopStatsBar', () => {
  it('renders breadcrumb labels', () => {
    render(<TopStatsBar />);
    expect(screen.getByText('Konut')).toBeInTheDocument();
    expect(screen.getByText('Ev Simülasyonu')).toBeInTheDocument();
  });

  it('renders page title', () => {
    render(<TopStatsBar />);
    expect(screen.getByText('Enerji Analiz Paneli')).toBeInTheDocument();
  });

  it('renders monthly consumption value', () => {
    render(<TopStatsBar />);
    expect(screen.getByText(/247\.8/)).toBeInTheDocument();
    expect(screen.getByText('kWh')).toBeInTheDocument();
  });

  it('renders monthly consumption label', () => {
    render(<TopStatsBar />);
    expect(screen.getByText(/Aylık Tüketim/i)).toBeInTheDocument();
  });
});

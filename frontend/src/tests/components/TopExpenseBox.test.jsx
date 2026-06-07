import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { LanguageProvider } from '../../contexts/LanguageProvider';

vi.mock('../../store/useSceneStore', () => ({
  default: vi.fn(),
}));

import useSceneStore from '../../store/useSceneStore';
import TopExpenseBox from '../../components/Dashboard/Home/TopExpenseBox';

const renderBox = () => render(<LanguageProvider><TopExpenseBox /></LanguageProvider>);

const makeStoreState = ({ objects = [], energyData = {}, deviceSpecs = {}, homeBillValidated = false } = {}) => {
  useSceneStore.mockImplementation((selector) =>
    selector({ objects, energyData, deviceSpecs, homeBillValidated })
  );
};

describe('TopExpenseBox', () => {
  it('shows dash when no devices', () => {
    makeStoreState();
    renderBox();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders top device by cost', () => {
    makeStoreState({
      objects: [{ id: 'o1', type: 'fridge' }],
      energyData: { o1: { total_monthly_cost: 450, efficiency_score: 70 } },
      deviceSpecs: { o1: { name: 'Buzdolabı' } },
    });
    renderBox();
    expect(screen.getByText('Buzdolabı')).toBeInTheDocument();
    expect(screen.getByText('₺450')).toBeInTheDocument();
  });

  it('shows max 3 devices', () => {
    const objects = [
      { id: 'o1', type: 'fridge' },
      { id: 'o2', type: 'tv' },
      { id: 'o3', type: 'ac' },
      { id: 'o4', type: 'oven' },
    ];
    const energyData = {
      o1: { total_monthly_cost: 400, efficiency_score: 70 },
      o2: { total_monthly_cost: 300, efficiency_score: 70 },
      o3: { total_monthly_cost: 500, efficiency_score: 70 },
      o4: { total_monthly_cost: 200, efficiency_score: 70 },
    };
    const deviceSpecs = {
      o1: { name: 'Buzdolabı' },
      o2: { name: 'TV' },
      o3: { name: 'Klima' },
      o4: { name: 'Fırın' },
    };
    makeStoreState({ objects, energyData, deviceSpecs });
    renderBox();
    // Fırın (200₺) should NOT appear — only top 3
    expect(screen.queryByText('Fırın')).not.toBeInTheDocument();
    expect(screen.getByText('Klima')).toBeInTheDocument();
  });

  it('skips devices with error energyData', () => {
    makeStoreState({
      objects: [{ id: 'o1', type: 'tv' }],
      energyData: { o1: 'error' },
      deviceSpecs: { o1: { name: 'TV' } },
    });
    renderBox();
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('shows "Faturadan" badge when bill-validated', () => {
    makeStoreState({
      objects: [{ id: 'o1', type: 'fridge' }],
      energyData: { o1: { total_monthly_cost: 300, efficiency_score: 85 } },
      deviceSpecs: { o1: { name: 'Buzdolabı' } },
      homeBillValidated: true,
    });
    renderBox();
    expect(screen.getByText('Faturadan')).toBeInTheDocument();
  });

  it('shows "Tahmin" badge when not validated', () => {
    makeStoreState({
      objects: [{ id: 'o1', type: 'fridge' }],
      energyData: { o1: { total_monthly_cost: 300, efficiency_score: 85 } },
      deviceSpecs: { o1: { name: 'Buzdolabı' } },
      homeBillValidated: false,
    });
    renderBox();
    expect(screen.getByText('Tahmin')).toBeInTheDocument();
  });
});

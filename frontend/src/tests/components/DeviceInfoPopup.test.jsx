import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ state: null }));

vi.mock('@react-three/drei', () => ({ Html: ({ children }) => <div>{children}</div> }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ user: { id: 'user-1' } }) }));
vi.mock('../../services/mlService', () => ({ runFullAnalysis: vi.fn() }));
vi.mock('../../store/useSceneStore', () => ({
  default: vi.fn((selector) => selector(mocks.state)),
}));

import { LanguageProvider } from '../../contexts/LanguageProvider';
import DeviceInfoPopup from '../../components/Simulation3D/DeviceInfoPopup';

describe('DeviceInfoPopup', () => {
  it('reads the current efficiency class directly from the scene store', () => {
    mocks.state = {
      pinnedDeviceId: 'device-1',
      setPinnedDeviceId: vi.fn(),
      setSelectedId: vi.fn(),
      setEnergyData: vi.fn(),
      setDeviceSpec: vi.fn(),
      removeSelected: vi.fn(),
      deviceSpecs: {
        'device-1': { name: 'Mutfaktaki dolap', efficiency_class: 'E', daily_usage_hours: 24 },
      },
      homeBillValidated: true,
      billingScaleFactor: 1.5,
    };

    render(
      <LanguageProvider>
        <DeviceInfoPopup
          object={{ id: 'device-1', type: 'fridge', position: [0, 0, 0], size: [1, 1, 1] }}
          energyData={{ total_monthly_kwh: 100, total_monthly_cost: 300, efficiency_score: 70 }}
        />
      </LanguageProvider>,
    );

    expect(screen.getByText('Verimlilik: E')).toBeInTheDocument();
    expect(screen.getByText('Mutfaktaki dolap')).toBeInTheDocument();
    expect(screen.getByText('150.0')).toBeInTheDocument();
    expect(screen.getByText('450')).toBeInTheDocument();
  });
});

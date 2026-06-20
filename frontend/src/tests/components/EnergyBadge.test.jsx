import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({ state: null }));

vi.mock('@react-three/drei', () => ({ Html: ({ children }) => <div>{children}</div> }));
vi.mock('../../store/useSceneStore', () => ({
  default: vi.fn((selector) => selector(mocks.state)),
}));

import EnergyBadge from '../../components/Simulation3D/EnergyBadge';

describe('EnergyBadge', () => {
  it('shows bill-scaled device consumption and cost as primary values', () => {
    mocks.state = {
      homeBillValidated: true,
      billingScaleFactor: 1.5,
      pinnedDeviceId: null,
      energyData: {
        'device-1': { total_monthly_kwh: 100, total_monthly_cost: 300, efficiency_score: 80 },
      },
    };

    render(
      <EnergyBadge
        objectId="device-1"
        object={{ position: [0, 0, 0], size: [1, 1, 1] }}
      />,
    );

    expect(screen.getByText(/150\.0/)).toBeInTheDocument();
    expect(screen.getByText(/₺450/)).toBeInTheDocument();
    expect(screen.queryByText(/kalibre/i)).not.toBeInTheDocument();
  });
});

import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  fetchCalibration: vi.fn(),
  applyCalibration: vi.fn(),
  applyEfficiencyCalibration: vi.fn(),
  applyBillingScale: vi.fn(),
  clearBillingScale: vi.fn(),
  runFullAnalysis: vi.fn(),
  setDeviceSpec: vi.fn(),
  setEnergyData: vi.fn(),
  setBillingScaleFactor: vi.fn(),
  state: null,
}));

vi.mock('../../services/calibrationService', () => ({
  fetchCalibration: mocks.fetchCalibration,
  applyCalibration: mocks.applyCalibration,
  applyEfficiencyCalibration: mocks.applyEfficiencyCalibration,
  applyBillingScale: mocks.applyBillingScale,
  clearBillingScale: mocks.clearBillingScale,
}));
vi.mock('../../services/mlService', () => ({ runFullAnalysis: mocks.runFullAnalysis }));
vi.mock('../../store/useSceneStore', () => ({
  default: vi.fn((selector) => selector(mocks.state)),
}));

import { LanguageProvider } from '../../contexts/LanguageProvider';
import CalibrationCard from '../../components/Dashboard/Bills/CalibrationCard';

describe('CalibrationCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.state = {
      objects: [{ id: 'device-1', type: 'fridge' }],
      energyData: { 'device-1': { total_monthly_kwh: 100, total_monthly_cost: 300 } },
      deviceSpecs: {
        'device-1': {
          name: 'A Sınıfı Buzdolabı',
          type: 'fridge',
          nominal_power_watts: 150,
          daily_usage_hours: 24,
          standby_power_watts: 2,
          efficiency_class: 'A',
          year_of_purchase: 2024,
        },
      },
      homeId: 'home-1',
      billingScaleFactor: null,
      setDeviceSpec: mocks.setDeviceSpec,
      setEnergyData: mocks.setEnergyData,
      setBillingScaleFactor: mocks.setBillingScaleFactor,
    };
    mocks.fetchCalibration.mockResolvedValue({
      predicted_kwh: 100,
      actual_kwh: 190,
      residual_kwh: 90,
      residual_pct: 47.4,
      bill_count: 2,
      scale_factor: 1.9,
      suggested_adjustments: [{
        device_id: 'device-1',
        device_name: 'A Sınıfı Buzdolabı',
        device_type_label: 'Buzdolabı',
        field: 'daily_usage_hours',
        from_value: 24,
        to_value: 20,
        impact_kwh_per_month: -15,
      }],
      efficiency_review: {
        type: 'efficiency_class',
        device_id: 'device-1',
        device_name: 'A Sınıfı Buzdolabı',
        device_type_label: 'Buzdolabı',
        from_class: 'A',
        to_class: 'E',
        impact_kwh_per_month: 90,
      },
      reconciled: false,
    });
    mocks.applyEfficiencyCalibration.mockResolvedValue({ ok: true, name: 'E Sınıfı Buzdolabı' });
    mocks.applyCalibration.mockResolvedValue({ ok: true });
    mocks.applyBillingScale.mockResolvedValue({ ok: true });
    mocks.clearBillingScale.mockResolvedValue({ ok: true });
    mocks.runFullAnalysis.mockResolvedValue({ total_monthly_kwh: 190 });
  });

  it('sends full device specs and applies a class change to store and ML', async () => {
    render(
      <LanguageProvider>
        <CalibrationCard
          summary={{ billCount: 2, avgMonthlyKwh: 190 }}
          userId="user-1"
        />
      </LanguageProvider>,
    );

    await waitFor(() => expect(screen.getByText(/Sınıf A/)).toBeInTheDocument());
    expect(mocks.fetchCalibration).toHaveBeenCalledWith(expect.objectContaining({
      devices: [expect.objectContaining({
        nominal_power_watts: 150,
        standby_power_watts: 2,
        efficiency_class: 'A',
        year_of_purchase: 2024,
      })],
    }));

    expect(screen.getByText('Saatleri güncelle')).toBeInTheDocument();
    expect(screen.getByText('Sınıfı güncelle')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Sınıfı güncelle'));

    await waitFor(() => expect(mocks.applyEfficiencyCalibration).toHaveBeenCalled());
    expect(mocks.setDeviceSpec).toHaveBeenCalledWith('device-1', expect.objectContaining({
      name: 'E Sınıfı Buzdolabı',
      efficiency_class: 'E',
    }));
    expect(mocks.runFullAnalysis).toHaveBeenCalledWith(
      'device-1',
      expect.objectContaining({ efficiency_class: 'E' }),
      'user-1',
    );
  });

  it('hides setting suggestions while bill scaling is active', async () => {
    mocks.state.billingScaleFactor = 1.9;

    render(
      <LanguageProvider>
        <CalibrationCard
          summary={{ billCount: 2, avgMonthlyKwh: 190 }}
          userId="user-1"
        />
      </LanguageProvider>,
    );

    await waitFor(() => expect(screen.getByText('Oranlama aktif')).toBeInTheDocument());
    expect(screen.queryByText('Saatleri güncelle')).not.toBeInTheDocument();
    expect(screen.queryByText('Sınıfı güncelle')).not.toBeInTheDocument();
    expect(screen.getByText('Kaldır')).toBeInTheDocument();
  });
});

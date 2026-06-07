import { describe, it, expect } from 'vitest';
import { efficiencyColor } from '../../utils/efficiencyColor';

describe('efficiencyColor', () => {
  it('returns green for score >= 80 when bill-validated', () => {
    expect(efficiencyColor(80, true)).toBe('#10b981');
    expect(efficiencyColor(100, true)).toBe('#10b981');
  });

  it('returns blue for score >= 80 without validation', () => {
    expect(efficiencyColor(80, false)).toBe('#60a5fa');
    expect(efficiencyColor(95)).toBe('#60a5fa');
  });

  it('returns amber for score 60–79', () => {
    expect(efficiencyColor(60)).toBe('#fbbf24');
    expect(efficiencyColor(79)).toBe('#fbbf24');
    expect(efficiencyColor(60, true)).toBe('#fbbf24');
  });

  it('returns red for score below 60', () => {
    expect(efficiencyColor(59)).toBe('#f87171');
    expect(efficiencyColor(0)).toBe('#f87171');
    expect(efficiencyColor(59, true)).toBe('#f87171');
  });

  it('defaults validated to false', () => {
    expect(efficiencyColor(90)).toBe('#60a5fa');
  });
});

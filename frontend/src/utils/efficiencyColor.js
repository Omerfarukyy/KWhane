/**
 * efficiencyColor — single source of truth for the device efficiency badge color.
 *
 * - Score >= 80 + bill-validated → green (real bill confirms efficient usage).
 * - Score >= 80 (predicted only)  → blue.
 * - Score >= 60                   → amber.
 * - Score <  60                   → red.
 */
export function efficiencyColor(score, validated = false) {
    if (score >= 80) return validated ? '#10b981' : '#60a5fa';
    if (score >= 60) return '#fbbf24';
    return '#f87171';
}

export default efficiencyColor;

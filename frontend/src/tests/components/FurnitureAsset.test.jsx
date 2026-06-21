import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AssetBoundary } from '../../components/Simulation3D/FurnitureAsset';

const BrokenModel = () => {
    throw new Error('model failed');
};

describe('FurnitureAsset', () => {
    it('shows the loading footprint fallback when a model fails', () => {
        const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
        const error = vi.spyOn(console, 'error').mockImplementation(() => {});
        render(
            <AssetBoundary fallback={<span>neutral footprint</span>}>
                <BrokenModel />
            </AssetBoundary>,
        );
        expect(screen.getByText('neutral footprint')).toBeInTheDocument();
        warn.mockRestore();
        error.mockRestore();
    });
});

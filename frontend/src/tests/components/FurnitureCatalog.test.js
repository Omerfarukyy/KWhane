import fs from 'node:fs';
import path from 'node:path';
import { cwd } from 'node:process';
import { describe, expect, it } from 'vitest';
import { FURNITURE_ASSETS } from '../../components/Simulation3D/FurnitureRegistry';

const publicRoot = path.resolve(cwd(), 'public');
const manifestPath = path.join(publicRoot, 'models/furniture/manifest.json');
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

describe('furniture catalog', () => {
    it('provides complete runtime metadata for every registered asset', () => {
        Object.values(FURNITURE_ASSETS).forEach((asset) => {
            expect(asset.url).toMatch(/^\/models\/furniture\/.+\.glb$/);
            expect(asset.size).toHaveLength(3);
            expect(asset.pivotCorrection).toHaveLength(3);
            expect(asset.materialPreset).toBe('warmModern');
            expect(typeof asset.repeatable).toBe('boolean');
            expect(asset.compactPriority).toBeGreaterThan(0);
            expect(asset.collision === false || asset.collision.length === 3).toBe(true);
        });
    });

    it('self-hosts every registered model and the Draco decoder', () => {
        new Set(Object.values(FURNITURE_ASSETS).map((asset) => asset.url)).forEach((url) => {
            expect(fs.existsSync(path.join(publicRoot, url.slice(1)))).toBe(true);
        });
        ['draco_decoder.js', 'draco_decoder.wasm', 'draco_wasm_wrapper.js'].forEach((file) => {
            expect(fs.existsSync(path.join(publicRoot, 'models/draco', file))).toBe(true);
        });
    });

    it('documents CC0 provenance and stays inside the transfer budget', () => {
        Object.values(manifest.sources).forEach((source) => expect(source.license).toContain('CC0'));
        const actualBytes = manifest.assets.reduce((total, asset) => {
            const filePath = path.join(publicRoot, 'models/furniture', asset.file);
            expect(fs.existsSync(filePath)).toBe(true);
            expect(fs.statSync(filePath).size).toBe(asset.bytes);
            expect(asset.triangles).toBeGreaterThan(0);
            expect(asset.bytes).toBeLessThan(1_000_000);
            return total + asset.bytes;
        }, 0);
        expect(actualBytes).toBe(manifest.catalogBytes);
        expect(actualBytes).toBeLessThanOrEqual(8_000_000);
    });
});

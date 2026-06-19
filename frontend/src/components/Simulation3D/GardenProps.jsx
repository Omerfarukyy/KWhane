import React, { useMemo } from 'react';
import * as THREE from 'three';

const TRUNK_COLORS = ['#5a3a1a', '#6b4a2b', '#4a3018'];
const FOLIAGE_COLORS = ['#3d7a2e', '#4a8c38', '#5c9a4e', '#3e6b32', '#68a84c'];
const BUSH_COLORS = ['#4a8040', '#5a9048', '#3d7030', '#62a050'];
const FLOWER_COLORS = ['#e84393', '#fd79a8', '#fdcb6e', '#e17055', '#a29bfe', '#74b9ff', '#ff7675'];
const ROCK_COLORS = ['#636e72', '#7a8288', '#57606a', '#8d9498'];

// ─── Grid-based prop scatter (uses the whole field, not a ring) ──────────────
// The ground plane is 200×200 (±100). We split the field into an 8×8 grid (64
// cells) and reserve the central 4×4 block (16 cells) for the house and its
// immediate surroundings — nothing spawns there. Props are dropped into the
// remaining 48 outer cells (one per cell, with in-cell jitter) so the entire
// area is populated rather than a tight ring around the house. Generated once
// from a fixed seed → deterministic across renders. All props sit on the ground
// (y = 0).
const GRID         = 8;
const FIELD        = 92;                 // half-extent of the scatter field
const CELL         = (FIELD * 2) / GRID; // ~23 units per cell
const RESERVED_LO  = 2;                  // central 4×4 block (indices 2..5) kept clear
const RESERVED_HI  = 5;

const scatterRng = (() => {
    let s = 1337;
    return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
})();

// All non-reserved cell centers, shuffled deterministically.
const SCATTER_CELLS = (() => {
    const cells = [];
    for (let cx = 0; cx < GRID; cx++) {
        for (let cz = 0; cz < GRID; cz++) {
            const reserved = cx >= RESERVED_LO && cx <= RESERVED_HI && cz >= RESERVED_LO && cz <= RESERVED_HI;
            if (reserved) continue;
            cells.push([-FIELD + (cx + 0.5) * CELL, -FIELD + (cz + 0.5) * CELL]);
        }
    }
    for (let i = cells.length - 1; i > 0; i--) {
        const j = Math.floor(scatterRng() * (i + 1));
        [cells[i], cells[j]] = [cells[j], cells[i]];
    }
    return cells;
})();

let cellCursor = 0;
function nextCellPos() {
    const [cx, cz] = SCATTER_CELLS[cellCursor++ % SCATTER_CELLS.length];
    const jx = (scatterRng() - 0.5) * CELL * 0.7;
    const jz = (scatterRng() - 0.5) * CELL * 0.7;
    return [cx + jx, 0, cz + jz];
}

// Pull a position toward the center by `factor` (×1 = unchanged), keeping a
// minimum radius so nothing lands on the house.
const MIN_RADIUS = 30;
function pullCloser([x, , z], factor) {
    let nx = x * factor, nz = z * factor;
    const r = Math.hypot(nx, nz);
    if (r > 0 && r < MIN_RADIUS) {
        const s = MIN_RADIUS / r;
        nx *= s; nz *= s;
    }
    return [Math.round(nx * 10) / 10, 0, Math.round(nz * 10) / 10];
}

// Distribute props in distance quartiles: the farthest 25% stay put, each
// following 25% sits 25% closer than the previous (×0.75, ×0.56, ×0.42), so the
// field fills in toward the house instead of hugging the far edges.
function place(n, build) {
    return Array.from({ length: n }, (_, i) => {
        const group = Math.floor(i / (n / 4));            // 0..3
        const factor = Math.pow(0.75, Math.min(group, 3));
        return build(pullCloser(nextCellPos(), factor));
    });
}

const TREE_POSITIONS = place(15, (pos) => ({
    pos,
    scale:   0.85 + scatterRng() * 0.5,
    variant: Math.floor(scatterRng() * 3),
}));

const BUSH_POSITIONS = place(8, (pos) => ({
    pos,
    scale:   0.7 + scatterRng() * 0.45,
    variant: Math.floor(scatterRng() * 4),
}));

const FLOWER_CLUSTERS = place(8, (pos) => ({
    pos,
    count: 3 + Math.floor(scatterRng() * 4),
}));

const ROCK_POSITIONS = place(8, (pos) => ({
    pos,
    scale: 0.5 + scatterRng() * 0.6,
    rot:   scatterRng() * Math.PI * 2,
}));

// ─── Shared materials (allocated once, never disposed) ───────────────────────
const trunkMaterials = TRUNK_COLORS.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95 }));
const foliageMaterials = FOLIAGE_COLORS.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.8, flatShading: true }));
const bushMaterials = BUSH_COLORS.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.85, flatShading: true }));
const rockMaterials = ROCK_COLORS.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true }));
const stemMaterial = new THREE.MeshStandardMaterial({ color: '#3a7028', roughness: 0.9 });
const flowerCenterMaterial = new THREE.MeshStandardMaterial({ color: '#fdcb6e', roughness: 0.5 });
const flowerPetalMaterials = FLOWER_COLORS.map(c => new THREE.MeshStandardMaterial({ color: c, roughness: 0.6 }));
const grassMaterial = new THREE.MeshStandardMaterial({ color: '#4a8838', roughness: 0.9, flatShading: true });
const pineLeafDarkMat = new THREE.MeshStandardMaterial({ color: '#2d5a22', roughness: 0.85, flatShading: true });

// ─── Shared geometries (allocated once) ──────────────────────────────────────
const trunkGeo = new THREE.CylinderGeometry(0.18, 0.35, 2.8, 6);
const knotGeo = new THREE.SphereGeometry(0.08, 4, 4);
const branchGeo = new THREE.CylinderGeometry(0.06, 0.1, 0.6, 4);
const branchGeo2 = new THREE.CylinderGeometry(0.05, 0.08, 0.5, 4);
const rootGeo = new THREE.CylinderGeometry(0.04, 0.1, 0.6, 4);
const rootGeo2 = new THREE.CylinderGeometry(0.04, 0.1, 0.5, 4);
const canopyGeo1 = new THREE.IcosahedronGeometry(1.6, 1);
const canopyGeo2 = new THREE.IcosahedronGeometry(1.2, 1);
const canopyGeo3 = new THREE.IcosahedronGeometry(1.0, 1);
const canopyGeo4 = new THREE.IcosahedronGeometry(0.7, 1);
const canopyGeo5 = new THREE.IcosahedronGeometry(0.8, 1);
const canopyGeo6 = new THREE.IcosahedronGeometry(0.75, 1);
const pineTrunkGeo = new THREE.CylinderGeometry(0.12, 0.25, 2.0, 5);
const pineCone1 = new THREE.ConeGeometry(1.5, 1.8, 5);
const pineCone2 = new THREE.ConeGeometry(1.2, 1.6, 5);
const pineCone3 = new THREE.ConeGeometry(0.8, 1.4, 5);
const pineCone4 = new THREE.ConeGeometry(0.45, 1.0, 5);
const roundTrunkGeo = new THREE.CylinderGeometry(0.15, 0.28, 2.4, 6);
const roundRootGeo = new THREE.CylinderGeometry(0.03, 0.08, 0.4, 4);
const roundCanopyGeo = new THREE.DodecahedronGeometry(1.5, 1);
const roundCanopyGeo2 = new THREE.DodecahedronGeometry(0.9, 1);
const bushGeo1 = new THREE.DodecahedronGeometry(0.75, 1);
const bushGeo2 = new THREE.DodecahedronGeometry(0.5, 1);
const bushGeo3 = new THREE.DodecahedronGeometry(0.45, 1);
const bushGeo4 = new THREE.DodecahedronGeometry(0.38, 1);
const rockGeo1 = new THREE.DodecahedronGeometry(0.35, 0);
const rockGeo2 = new THREE.DodecahedronGeometry(0.2, 0);
const stemGeo = new THREE.CylinderGeometry(0.015, 0.02, 0.35, 3);
const petalGeo = new THREE.SphereGeometry(0.08, 4, 4);
const centerGeo = new THREE.SphereGeometry(0.032, 4, 4);
const grassGeo = new THREE.ConeGeometry(0.06, 0.2, 3);

// ─── Trees ───────────────────────────────────────────────────────────────────
// Only the main canopy casts shadow; trunks/branches/roots skip it for perf.
const OakTree = ({ position, scale = 1, variant = 0 }) => {
    const trunk = trunkMaterials[variant % TRUNK_COLORS.length];
    const leaf1 = foliageMaterials[variant % FOLIAGE_COLORS.length];
    const leaf2 = foliageMaterials[(variant + 1) % FOLIAGE_COLORS.length];
    const leaf3 = foliageMaterials[(variant + 2) % FOLIAGE_COLORS.length];

    return (
        <group position={position} scale={scale}>
            <mesh castShadow position={[0, 1.4, 0]} geometry={trunkGeo} material={trunk} />
            <mesh position={[0.15, 1.8, 0.12]} geometry={knotGeo} material={trunk} />
            <mesh position={[0.22, 2.2, 0]} rotation={[0, 0, Math.PI / 4]} geometry={branchGeo} material={trunk} />
            <mesh position={[-0.18, 2.5, 0.1]} rotation={[0.2, 0, -Math.PI / 3.5]} geometry={branchGeo2} material={trunk} />
            <mesh position={[0.25, 0.08, 0.15]} rotation={[0.3, 0.5, 0.1]} geometry={rootGeo} material={trunk} />
            <mesh position={[-0.2, 0.08, -0.2]} rotation={[-0.3, -0.8, -0.1]} geometry={rootGeo2} material={trunk} />
            <mesh castShadow position={[0, 3.5, 0]} geometry={canopyGeo1} material={leaf1} />
            <mesh castShadow position={[0.6, 3.9, 0.3]} geometry={canopyGeo2} material={leaf2} />
            <mesh position={[-0.5, 4.2, -0.2]} geometry={canopyGeo3} material={leaf3} />
            <mesh position={[0.2, 4.6, 0.4]} geometry={canopyGeo4} material={leaf1} />
            <mesh position={[-0.9, 3.2, 0.5]} geometry={canopyGeo5} material={leaf2} />
            <mesh position={[0.8, 3.0, -0.6]} geometry={canopyGeo6} material={leaf3} />
        </group>
    );
};

const PineTree = ({ position, scale = 1, variant = 0 }) => {
    const trunk = trunkMaterials[(variant + 1) % TRUNK_COLORS.length];
    const leaf = foliageMaterials[(variant + 3) % FOLIAGE_COLORS.length];

    return (
        <group position={position} scale={scale}>
            <mesh castShadow position={[0, 1.0, 0]} geometry={pineTrunkGeo} material={trunk} />
            <mesh castShadow position={[0, 2.2, 0]} geometry={pineCone1} material={pineLeafDarkMat} />
            <mesh position={[0, 3.2, 0]} geometry={pineCone2} material={leaf} />
            <mesh position={[0, 4.0, 0]} geometry={pineCone3} material={pineLeafDarkMat} />
            <mesh position={[0, 4.7, 0]} geometry={pineCone4} material={leaf} />
        </group>
    );
};

const RoundTree = ({ position, scale = 1, variant = 0 }) => {
    const trunk = trunkMaterials[variant % TRUNK_COLORS.length];
    const leaf = foliageMaterials[(variant + 2) % FOLIAGE_COLORS.length];
    const leaf2 = foliageMaterials[(variant + 4) % FOLIAGE_COLORS.length];

    return (
        <group position={position} scale={scale}>
            <mesh castShadow position={[0, 1.2, 0]} geometry={roundTrunkGeo} material={trunk} />
            <mesh position={[0.2, 0.1, 0.15]} rotation={[0.4, 0.3, 0.2]} geometry={roundRootGeo} material={trunk} />
            <mesh castShadow position={[0, 3.4, 0]} geometry={roundCanopyGeo} material={leaf} />
            <mesh position={[0.4, 3.8, 0.3]} geometry={roundCanopyGeo2} material={leaf2} />
        </group>
    );
};

const TREE_COMPONENTS = [OakTree, PineTree, RoundTree];

// Bushes — no shadows (distant decorations)
const Bush = ({ position, scale = 1, variant = 0 }) => {
    const c1 = bushMaterials[variant % BUSH_COLORS.length];
    const c2 = bushMaterials[(variant + 1) % BUSH_COLORS.length];

    return (
        <group position={position} scale={scale}>
            <mesh castShadow position={[0, 0.5, 0]} geometry={bushGeo1} material={c1} />
            <mesh position={[0.5, 0.4, 0.25]} geometry={bushGeo2} material={c2} />
            <mesh position={[-0.4, 0.35, -0.2]} geometry={bushGeo3} material={c1} />
            <mesh position={[0.15, 0.3, -0.45]} geometry={bushGeo4} material={c2} />
        </group>
    );
};

const seededRandom = (seed) => {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
};

// Flowers — no shadows, shared geometries
const FlowerCluster = ({ position, count }) => {
    const flowers = useMemo(() => {
        const rng = seededRandom(Math.abs(position[0] * 1000 + position[2] * 37));
        return Array.from({ length: count }, () => {
            const angle = rng() * Math.PI * 2;
            const dist = rng() * 1.2;
            const colorIdx = Math.floor(rng() * FLOWER_COLORS.length);
            const stemH = 0.25 + rng() * 0.2;
            return {
                x: Math.cos(angle) * dist,
                z: Math.sin(angle) * dist,
                colorIdx,
                stemH,
            };
        });
    }, [position, count]);

    return (
        <group position={position}>
            {flowers.map((f, i) => (
                <group key={i} position={[f.x, 0, f.z]}>
                    <mesh position={[0, f.stemH / 2, 0]} geometry={stemGeo} material={stemMaterial} />
                    <mesh position={[0, f.stemH + 0.03, 0]} geometry={petalGeo} material={flowerPetalMaterials[f.colorIdx]} />
                    <mesh position={[0, f.stemH + 0.05, 0]} geometry={centerGeo} material={flowerCenterMaterial} />
                </group>
            ))}
            {flowers.slice(0, 3).map((f, i) => (
                <mesh key={`g-${i}`} position={[f.x + 0.1, 0.1, f.z - 0.1]} geometry={grassGeo} material={grassMaterial} />
            ))}
        </group>
    );
};

// Rocks — no shadows
const Rock = ({ position, scale = 1, rot = 0 }) => {
    const mat1 = rockMaterials[Math.floor(Math.abs(position[0] * 3 + position[2])) % ROCK_COLORS.length];
    const mat2 = rockMaterials[(Math.floor(Math.abs(position[0])) + 1) % ROCK_COLORS.length];
    return (
        <group position={position} scale={scale} rotation={[0, rot, 0]}>
            <mesh position={[0, 0.18, 0]} geometry={rockGeo1} material={mat1} />
            <mesh position={[0.25, 0.1, 0.15]} rotation={[0.3, 0.5, 0]} geometry={rockGeo2} material={mat2} />
        </group>
    );
};

const GardenProps = () => (
    <group>
        {TREE_POSITIONS.map((t, i) => {
            const TreeComp = TREE_COMPONENTS[t.variant % TREE_COMPONENTS.length];
            return <TreeComp key={`tree-${i}`} position={t.pos} scale={t.scale} variant={i} />;
        })}
        {BUSH_POSITIONS.map((b, i) => (
            <Bush key={`bush-${i}`} position={b.pos} scale={b.scale} variant={b.variant} />
        ))}
        {FLOWER_CLUSTERS.map((f, i) => (
            <FlowerCluster key={`flowers-${i}`} position={f.pos} count={f.count} />
        ))}
        {ROCK_POSITIONS.map((r, i) => (
            <Rock key={`rock-${i}`} position={r.pos} scale={r.scale} rot={r.rot} />
        ))}
    </group>
);

export default React.memo(GardenProps);

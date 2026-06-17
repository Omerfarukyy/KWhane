import React, { useMemo } from 'react';
import * as THREE from 'three';

const TRUNK_COLORS = ['#5a3a1a', '#6b4a2b', '#4a3018'];
const FOLIAGE_COLORS = ['#3d7a2e', '#4a8c38', '#5c9a4e', '#3e6b32', '#68a84c'];
const BUSH_COLORS = ['#4a8040', '#5a9048', '#3d7030', '#62a050'];
const FLOWER_COLORS = ['#e84393', '#fd79a8', '#fdcb6e', '#e17055', '#a29bfe', '#74b9ff', '#ff7675'];
const ROCK_COLORS = ['#636e72', '#7a8288', '#57606a', '#8d9498'];

const TREE_POSITIONS = [
    { pos: [-26, 0, -24], scale: 1.1, variant: 0 },
    { pos: [-30, 0, 6],   scale: 1.3, variant: 1 },
    { pos: [-24, 0, 27],  scale: 0.95, variant: 2 },
    { pos: [-34, 0, -8],  scale: 1.2, variant: 0 },
    { pos: [26, 0, -22],  scale: 1.05, variant: 1 },
    { pos: [30, 0, 10],   scale: 1.15, variant: 2 },
    { pos: [23, 0, 30],   scale: 1.0, variant: 0 },
    { pos: [32, 0, -6],   scale: 1.25, variant: 1 },
    { pos: [5, 0, -32],   scale: 1.1, variant: 2 },
    { pos: [-10, 0, -34], scale: 0.9, variant: 0 },
    { pos: [14, 0, 34],   scale: 1.2, variant: 1 },
    { pos: [-18, 0, 36],  scale: 1.0, variant: 2 },
    { pos: [-38, 0, 18],  scale: 0.85, variant: 1 },
    { pos: [38, 0, 22],   scale: 0.95, variant: 0 },
    { pos: [0, 0, -38],   scale: 1.15, variant: 2 },
];

const BUSH_POSITIONS = [
    { pos: [-18, 0, -16], scale: 0.9, variant: 0 },
    { pos: [19, 0, -14],  scale: 1.1, variant: 1 },
    { pos: [-16, 0, 20],  scale: 0.85, variant: 2 },
    { pos: [17, 0, 18],   scale: 1.0, variant: 0 },
    { pos: [-22, 0, 2],   scale: 0.95, variant: 1 },
    { pos: [24, 0, -2],   scale: 0.9, variant: 3 },
    { pos: [-28, 0, -18], scale: 0.7, variant: 2 },
    { pos: [28, 0, 16],   scale: 0.75, variant: 0 },
];

const FLOWER_CLUSTERS = [
    { pos: [-20, 0, -10], count: 5 },
    { pos: [16, 0, -18],  count: 4 },
    { pos: [-14, 0, 24],  count: 6 },
    { pos: [20, 0, 24],   count: 4 },
    { pos: [-32, 0, 14],  count: 3 },
    { pos: [34, 0, -14],  count: 5 },
    { pos: [8, 0, -28],   count: 3 },
    { pos: [-8, 0, 32],   count: 4 },
];

const ROCK_POSITIONS = [
    { pos: [-22, 0, -20], scale: 0.8, rot: 0.3 },
    { pos: [21, 0, -8],   scale: 1.1, rot: 1.2 },
    { pos: [-12, 0, 28],  scale: 0.6, rot: 2.1 },
    { pos: [28, 0, 26],   scale: 0.9, rot: 0.7 },
    { pos: [-36, 0, -2],  scale: 0.7, rot: 1.8 },
    { pos: [10, 0, -36],  scale: 0.5, rot: 0.4 },
    { pos: [-26, 0, 30],  scale: 0.65, rot: 2.5 },
    { pos: [36, 0, 4],    scale: 0.55, rot: 1.1 },
];

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
            <mesh position={[0, 1.4, 0]} geometry={trunkGeo} material={trunk} />
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
            <mesh position={[0, 1.0, 0]} geometry={pineTrunkGeo} material={trunk} />
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
            <mesh position={[0, 1.2, 0]} geometry={roundTrunkGeo} material={trunk} />
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
            <mesh position={[0, 0.55, 0]} geometry={bushGeo1} material={c1} />
            <mesh position={[0.5, 0.45, 0.25]} geometry={bushGeo2} material={c2} />
            <mesh position={[-0.4, 0.4, -0.2]} geometry={bushGeo3} material={c1} />
            <mesh position={[0.15, 0.35, -0.45]} geometry={bushGeo4} material={c2} />
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

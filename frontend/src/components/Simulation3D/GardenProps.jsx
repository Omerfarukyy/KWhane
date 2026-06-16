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

const OakTree = ({ position, scale = 1, variant = 0 }) => {
    const trunk = TRUNK_COLORS[variant % TRUNK_COLORS.length];
    const leaf1 = FOLIAGE_COLORS[variant % FOLIAGE_COLORS.length];
    const leaf2 = FOLIAGE_COLORS[(variant + 1) % FOLIAGE_COLORS.length];
    const leaf3 = FOLIAGE_COLORS[(variant + 2) % FOLIAGE_COLORS.length];

    return (
        <group position={position} scale={scale}>
            {/* Main trunk */}
            <mesh castShadow receiveShadow position={[0, 1.4, 0]}>
                <cylinderGeometry args={[0.18, 0.35, 2.8, 8]} />
                <meshStandardMaterial color={trunk} roughness={0.95} />
            </mesh>
            {/* Trunk knot detail */}
            <mesh castShadow position={[0.15, 1.8, 0.12]}>
                <sphereGeometry args={[0.08, 6, 6]} />
                <meshStandardMaterial color={trunk} roughness={1} />
            </mesh>
            {/* Branch stubs */}
            <mesh castShadow position={[0.22, 2.2, 0]} rotation={[0, 0, Math.PI / 4]}>
                <cylinderGeometry args={[0.06, 0.1, 0.6, 5]} />
                <meshStandardMaterial color={trunk} roughness={0.95} />
            </mesh>
            <mesh castShadow position={[-0.18, 2.5, 0.1]} rotation={[0.2, 0, -Math.PI / 3.5]}>
                <cylinderGeometry args={[0.05, 0.08, 0.5, 5]} />
                <meshStandardMaterial color={trunk} roughness={0.95} />
            </mesh>
            {/* Visible roots */}
            <mesh castShadow position={[0.25, 0.08, 0.15]} rotation={[0.3, 0.5, 0.1]}>
                <cylinderGeometry args={[0.04, 0.1, 0.6, 5]} />
                <meshStandardMaterial color={trunk} roughness={0.95} />
            </mesh>
            <mesh castShadow position={[-0.2, 0.08, -0.2]} rotation={[-0.3, -0.8, -0.1]}>
                <cylinderGeometry args={[0.04, 0.1, 0.5, 5]} />
                <meshStandardMaterial color={trunk} roughness={0.95} />
            </mesh>
            {/* Main canopy — layered spheres for volume */}
            <mesh castShadow receiveShadow position={[0, 3.5, 0]}>
                <icosahedronGeometry args={[1.6, 1]} />
                <meshStandardMaterial color={leaf1} roughness={0.8} flatShading />
            </mesh>
            <mesh castShadow receiveShadow position={[0.6, 3.9, 0.3]}>
                <icosahedronGeometry args={[1.2, 1]} />
                <meshStandardMaterial color={leaf2} roughness={0.8} flatShading />
            </mesh>
            <mesh castShadow receiveShadow position={[-0.5, 4.2, -0.2]}>
                <icosahedronGeometry args={[1.0, 1]} />
                <meshStandardMaterial color={leaf3} roughness={0.8} flatShading />
            </mesh>
            <mesh castShadow receiveShadow position={[0.2, 4.6, 0.4]}>
                <icosahedronGeometry args={[0.7, 1]} />
                <meshStandardMaterial color={leaf1} roughness={0.8} flatShading />
            </mesh>
            {/* Side canopy clusters */}
            <mesh castShadow receiveShadow position={[-0.9, 3.2, 0.5]}>
                <icosahedronGeometry args={[0.8, 1]} />
                <meshStandardMaterial color={leaf2} roughness={0.82} flatShading />
            </mesh>
            <mesh castShadow receiveShadow position={[0.8, 3.0, -0.6]}>
                <icosahedronGeometry args={[0.75, 1]} />
                <meshStandardMaterial color={leaf3} roughness={0.82} flatShading />
            </mesh>
        </group>
    );
};

const PineTree = ({ position, scale = 1, variant = 0 }) => {
    const trunk = TRUNK_COLORS[(variant + 1) % TRUNK_COLORS.length];
    const leaf = FOLIAGE_COLORS[(variant + 3) % FOLIAGE_COLORS.length];
    const leafDark = '#2d5a22';

    return (
        <group position={position} scale={scale}>
            {/* Trunk */}
            <mesh castShadow receiveShadow position={[0, 1.0, 0]}>
                <cylinderGeometry args={[0.12, 0.25, 2.0, 7]} />
                <meshStandardMaterial color={trunk} roughness={0.95} />
            </mesh>
            {/* Layered cone canopy */}
            <mesh castShadow receiveShadow position={[0, 2.2, 0]}>
                <coneGeometry args={[1.5, 1.8, 7]} />
                <meshStandardMaterial color={leafDark} roughness={0.85} flatShading />
            </mesh>
            <mesh castShadow receiveShadow position={[0, 3.2, 0]}>
                <coneGeometry args={[1.2, 1.6, 7]} />
                <meshStandardMaterial color={leaf} roughness={0.85} flatShading />
            </mesh>
            <mesh castShadow receiveShadow position={[0, 4.0, 0]}>
                <coneGeometry args={[0.8, 1.4, 7]} />
                <meshStandardMaterial color={leafDark} roughness={0.85} flatShading />
            </mesh>
            <mesh castShadow receiveShadow position={[0, 4.7, 0]}>
                <coneGeometry args={[0.45, 1.0, 6]} />
                <meshStandardMaterial color={leaf} roughness={0.85} flatShading />
            </mesh>
        </group>
    );
};

const RoundTree = ({ position, scale = 1, variant = 0 }) => {
    const trunk = TRUNK_COLORS[variant % TRUNK_COLORS.length];
    const leaf = FOLIAGE_COLORS[(variant + 2) % FOLIAGE_COLORS.length];

    return (
        <group position={position} scale={scale}>
            {/* Trunk */}
            <mesh castShadow receiveShadow position={[0, 1.2, 0]}>
                <cylinderGeometry args={[0.15, 0.28, 2.4, 8]} />
                <meshStandardMaterial color={trunk} roughness={0.95} />
            </mesh>
            {/* Root flares */}
            <mesh castShadow position={[0.2, 0.1, 0.15]} rotation={[0.4, 0.3, 0.2]}>
                <cylinderGeometry args={[0.03, 0.08, 0.4, 4]} />
                <meshStandardMaterial color={trunk} roughness={0.95} />
            </mesh>
            {/* Round canopy — dodecahedron for organic roundness */}
            <mesh castShadow receiveShadow position={[0, 3.4, 0]}>
                <dodecahedronGeometry args={[1.5, 1]} />
                <meshStandardMaterial color={leaf} roughness={0.78} flatShading />
            </mesh>
            <mesh castShadow receiveShadow position={[0.4, 3.8, 0.3]}>
                <dodecahedronGeometry args={[0.9, 1]} />
                <meshStandardMaterial color={FOLIAGE_COLORS[(variant + 4) % FOLIAGE_COLORS.length]} roughness={0.78} flatShading />
            </mesh>
        </group>
    );
};

const TREE_COMPONENTS = [OakTree, PineTree, RoundTree];

const Bush = ({ position, scale = 1, variant = 0 }) => {
    const c1 = BUSH_COLORS[variant % BUSH_COLORS.length];
    const c2 = BUSH_COLORS[(variant + 1) % BUSH_COLORS.length];

    return (
        <group position={position} scale={scale}>
            <mesh castShadow receiveShadow position={[0, 0.55, 0]}>
                <dodecahedronGeometry args={[0.75, 1]} />
                <meshStandardMaterial color={c1} roughness={0.85} flatShading />
            </mesh>
            <mesh castShadow receiveShadow position={[0.5, 0.45, 0.25]}>
                <dodecahedronGeometry args={[0.5, 1]} />
                <meshStandardMaterial color={c2} roughness={0.85} flatShading />
            </mesh>
            <mesh castShadow receiveShadow position={[-0.4, 0.4, -0.2]}>
                <dodecahedronGeometry args={[0.45, 1]} />
                <meshStandardMaterial color={c1} roughness={0.85} flatShading />
            </mesh>
            <mesh castShadow receiveShadow position={[0.15, 0.35, -0.45]}>
                <dodecahedronGeometry args={[0.38, 1]} />
                <meshStandardMaterial color={c2} roughness={0.85} flatShading />
            </mesh>
        </group>
    );
};

const seededRandom = (seed) => {
    let s = seed;
    return () => { s = (s * 16807 + 0) % 2147483647; return s / 2147483647; };
};

const FlowerCluster = ({ position, count }) => {
    const flowers = useMemo(() => {
        const rng = seededRandom(Math.abs(position[0] * 1000 + position[2] * 37));
        return Array.from({ length: count }, (_, i) => {
            const angle = rng() * Math.PI * 2;
            const dist = rng() * 1.2;
            const color = FLOWER_COLORS[Math.floor(rng() * FLOWER_COLORS.length)];
            const stemH = 0.25 + rng() * 0.2;
            return {
                x: Math.cos(angle) * dist,
                z: Math.sin(angle) * dist,
                color,
                stemH,
                petalSize: 0.06 + rng() * 0.04,
            };
        });
    }, [position, count]);

    return (
        <group position={position}>
            {flowers.map((f, i) => (
                <group key={i} position={[f.x, 0, f.z]}>
                    {/* Stem */}
                    <mesh position={[0, f.stemH / 2, 0]}>
                        <cylinderGeometry args={[0.015, 0.02, f.stemH, 4]} />
                        <meshStandardMaterial color="#3a7028" roughness={0.9} />
                    </mesh>
                    {/* Petal head */}
                    <mesh position={[0, f.stemH + 0.03, 0]}>
                        <sphereGeometry args={[f.petalSize, 6, 6]} />
                        <meshStandardMaterial color={f.color} roughness={0.6} />
                    </mesh>
                    {/* Center */}
                    <mesh position={[0, f.stemH + 0.05, 0]}>
                        <sphereGeometry args={[f.petalSize * 0.4, 4, 4]} />
                        <meshStandardMaterial color="#fdcb6e" roughness={0.5} />
                    </mesh>
                </group>
            ))}
            {/* Ground grass tufts around flowers */}
            {flowers.slice(0, 3).map((f, i) => (
                <mesh key={`grass-${i}`} position={[f.x + 0.1, 0.1, f.z - 0.1]}>
                    <coneGeometry args={[0.06, 0.2, 3]} />
                    <meshStandardMaterial color="#4a8838" roughness={0.9} flatShading />
                </mesh>
            ))}
        </group>
    );
};

const Rock = ({ position, scale = 1, rot = 0 }) => {
    const color = ROCK_COLORS[Math.floor(Math.abs(position[0] * 3 + position[2])) % ROCK_COLORS.length];
    return (
        <group position={position} scale={scale} rotation={[0, rot, 0]}>
            <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
                <dodecahedronGeometry args={[0.35, 0]} />
                <meshStandardMaterial color={color} roughness={0.95} flatShading />
            </mesh>
            <mesh castShadow receiveShadow position={[0.25, 0.1, 0.15]} rotation={[0.3, 0.5, 0]}>
                <dodecahedronGeometry args={[0.2, 0]} />
                <meshStandardMaterial color={ROCK_COLORS[(Math.floor(Math.abs(position[0])) + 1) % ROCK_COLORS.length]} roughness={0.95} flatShading />
            </mesh>
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

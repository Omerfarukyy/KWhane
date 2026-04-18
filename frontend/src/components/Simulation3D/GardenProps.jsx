/**
 * GardenProps.jsx — Bahçe dekoru (ağaçlar + çalılar)
 *
 * Düşük-poli, stilize low-poly ağaçlar: silindir gövde + istiflenmiş icosahedron yapraklar.
 * Konumlar sabit (deterministik); rooms bölgesinin dışındaki bantta dağıtıldı.
 * Yaprak rengi 3 tondan seçiliyor, hafif varyasyon için.
 */

const FOLIAGE_COLORS = ['#4a7c3a', '#5c9a4e', '#3e6b32'];

const TREE_POSITIONS = [
    { pos: [-26, 0, -24], scale: 1.1, hue: 0 },
    { pos: [-30, 0, 6],   scale: 1.3, hue: 1 },
    { pos: [-24, 0, 27],  scale: 0.95, hue: 0 },
    { pos: [-34, 0, -8],  scale: 1.2, hue: 2 },
    { pos: [26, 0, -22],  scale: 1.05, hue: 1 },
    { pos: [30, 0, 10],   scale: 1.15, hue: 0 },
    { pos: [23, 0, 30],   scale: 1.0, hue: 2 },
    { pos: [32, 0, -6],   scale: 1.25, hue: 1 },
    { pos: [5, 0, -32],   scale: 1.1, hue: 0 },
    { pos: [-10, 0, -34], scale: 0.9, hue: 2 },
    { pos: [14, 0, 34],   scale: 1.2, hue: 0 },
    { pos: [-18, 0, 36],  scale: 1.0, hue: 1 },
];

const BUSH_POSITIONS = [
    { pos: [-18, 0, -16], scale: 0.9 },
    { pos: [19, 0, -14],  scale: 1.1 },
    { pos: [-16, 0, 20],  scale: 0.85 },
    { pos: [17, 0, 18],   scale: 1.0 },
    { pos: [-22, 0, 2],   scale: 0.95 },
    { pos: [24, 0, -2],   scale: 0.9 },
];

const Tree = ({ position, scale = 1, hue = 0 }) => {
    const color = FOLIAGE_COLORS[hue];
    return (
        <group position={position} scale={scale}>
            {/* Gövde */}
            <mesh castShadow receiveShadow position={[0, 1.2, 0]}>
                <cylinderGeometry args={[0.25, 0.4, 2.4, 8]} />
                <meshStandardMaterial color="#6b4a2b" roughness={0.95} metalness={0} />
            </mesh>
            {/* İstiflenmiş yaprak kütleleri — low-poly flat shading */}
            <mesh castShadow receiveShadow position={[0, 3.0, 0]}>
                <icosahedronGeometry args={[1.4, 0]} />
                <meshStandardMaterial color={color} roughness={0.85} flatShading />
            </mesh>
            <mesh castShadow receiveShadow position={[0.45, 3.6, 0.25]}>
                <icosahedronGeometry args={[1.0, 0]} />
                <meshStandardMaterial color={color} roughness={0.85} flatShading />
            </mesh>
            <mesh castShadow receiveShadow position={[-0.3, 4.05, -0.3]}>
                <icosahedronGeometry args={[0.8, 0]} />
                <meshStandardMaterial color={color} roughness={0.85} flatShading />
            </mesh>
        </group>
    );
};

const Bush = ({ position, scale = 1 }) => (
    <group position={position} scale={scale}>
        <mesh castShadow receiveShadow position={[0, 0.5, 0]}>
            <icosahedronGeometry args={[0.8, 0]} />
            <meshStandardMaterial color="#5a8a48" roughness={0.9} flatShading />
        </mesh>
        <mesh castShadow receiveShadow position={[0.55, 0.4, 0.3]}>
            <icosahedronGeometry args={[0.5, 0]} />
            <meshStandardMaterial color="#5a8a48" roughness={0.9} flatShading />
        </mesh>
        <mesh castShadow receiveShadow position={[-0.45, 0.35, -0.25]}>
            <icosahedronGeometry args={[0.45, 0]} />
            <meshStandardMaterial color="#5a8a48" roughness={0.9} flatShading />
        </mesh>
    </group>
);

const GardenProps = () => (
    <group>
        {TREE_POSITIONS.map((t, i) => (
            <Tree key={`tree-${i}`} position={t.pos} scale={t.scale} hue={t.hue} />
        ))}
        {BUSH_POSITIONS.map((b, i) => (
            <Bush key={`bush-${i}`} position={b.pos} scale={b.scale} />
        ))}
    </group>
);

export default GardenProps;

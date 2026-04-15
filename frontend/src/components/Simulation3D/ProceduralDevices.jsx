import React from 'react';

/**
 * ProceduralDevices — KWhane cihaz görselleştirmeleri
 * Tüm desteklenen 10 cihaz türü için Three.js geometrisi.
 */

// 1. Televizyon
export const Television = ({ size = [1.2, 0.8, 0.1] }) => (
    <group>
        <mesh position={[0, size[1] / 2, 0]} castShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color="#111111" roughness={0.5} />
        </mesh>
        <mesh position={[0, size[1] / 2, size[2] / 2 + 0.005]} castShadow>
            <boxGeometry args={[size[0] - 0.05, size[1] - 0.05, 0.005]} />
            <meshStandardMaterial color="#000000" metalness={0.9} roughness={0.05} />
        </mesh>
        <mesh position={[0, 0.01, 0]}>
            <boxGeometry args={[0.2, 0.02, 0.1]} />
            <meshStandardMaterial color="#1e293b" metalness={0.7} />
        </mesh>
    </group>
);

// 2. Klima
export const AirConditioner = ({ size = [0.9, 0.3, 0.3] }) => (
    <group>
        <mesh position={[0, size[1] / 2, 0]} castShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
        <mesh position={[0, size[1] / 4, size[2] / 2 + 0.005]}>
            <boxGeometry args={[size[0] - 0.05, 0.06, 0.01]} />
            <meshStandardMaterial color="#e2e8f0" />
        </mesh>
        <mesh position={[size[0] / 3, size[1] / 2, size[2] / 2 + 0.008]}>
            <planeGeometry args={[0.06, 0.03]} />
            <meshBasicMaterial color="#38bdf8" transparent opacity={0.7} />
        </mesh>
    </group>
);

// 3. Buzdolabı
export const Fridge = ({ size = [0.7, 1.8, 0.7] }) => (
    <group>
        <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color="#94a3b8" metalness={0.5} roughness={0.2} />
        </mesh>
        <mesh position={[0, size[1] * 0.55, size[2] / 2 + 0.005]}>
            <planeGeometry args={[size[0] - 0.02, 0.004]} />
            <meshBasicMaterial color="#475569" />
        </mesh>
        <mesh position={[size[0] / 2 - 0.08, size[1] * 0.6, size[2] / 2 + 0.025]} castShadow>
            <boxGeometry args={[0.025, 0.5, 0.025]} />
            <meshStandardMaterial color="#1e293b" metalness={0.8} />
        </mesh>
    </group>
);

// 4. Çamaşır Makinesi
export const WashingMachine = ({ size = [0.6, 0.85, 0.6] }) => (
    <group>
        <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
        </mesh>
        <mesh position={[0, size[1] / 2, size[2] / 2 + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.18, 0.025, 16, 32]} />
            <meshStandardMaterial color="#cbd5e1" metalness={0.5} />
        </mesh>
        <mesh position={[0, size[1] / 2, size[2] / 2 + 0.008]}>
            <circleGeometry args={[0.17, 32]} />
            <meshStandardMaterial color="#334155" transparent opacity={0.35} metalness={0.9} roughness={0} />
        </mesh>
        <mesh position={[-0.12, size[1] - 0.08, size[2] / 2 + 0.008]}>
            <planeGeometry args={[0.15, 0.07]} />
            <meshStandardMaterial color="#cbd5e1" />
        </mesh>
    </group>
);

// 5. Bulaşık Makinesi
export const Dishwasher = ({ size = [0.6, 0.85, 0.6] }) => (
    <group>
        <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color="#e2e8f0" roughness={0.35} />
        </mesh>
        <mesh position={[0, size[1] - 0.08, size[2] / 2 + 0.006]}>
            <planeGeometry args={[size[0] - 0.1, 0.06]} />
            <meshStandardMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[0, size[1] * 0.55, size[2] / 2 + 0.004]}>
            <planeGeometry args={[size[0] - 0.04, 0.003]} />
            <meshBasicMaterial color="#94a3b8" />
        </mesh>
        <mesh position={[size[0] / 2 - 0.06, size[1] * 0.75, size[2] / 2 + 0.025]}>
            <boxGeometry args={[0.025, 0.25, 0.025]} />
            <meshStandardMaterial color="#64748b" metalness={0.7} />
        </mesh>
    </group>
);

// 6. Fırın
export const Oven = ({ size = [0.6, 0.6, 0.6] }) => (
    <group>
        <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color="#6b7280" metalness={0.4} roughness={0.5} />
        </mesh>
        <mesh position={[0, size[1] / 2, size[2] / 2 + 0.005]}>
            <boxGeometry args={[size[0] - 0.1, size[1] - 0.15, 0.01]} />
            <meshStandardMaterial color="#1a1a1a" transparent opacity={0.5} />
        </mesh>
        {[-0.1, 0, 0.1].map((x, i) => (
            <mesh key={i} position={[x, size[1] - 0.05, size[2] / 2 + 0.008]}>
                <cylinderGeometry args={[0.025, 0.025, 0.02, 16]} />
                <meshStandardMaterial color="#374151" metalness={0.6} />
            </mesh>
        ))}
        <mesh position={[size[0] / 2 - 0.08, size[1] / 2, size[2] / 2 + 0.025]}>
            <boxGeometry args={[0.02, 0.3, 0.02]} />
            <meshStandardMaterial color="#374151" metalness={0.8} />
        </mesh>
    </group>
);

// 7. Bilgisayar (Monitör + Kule)
export const Computer = ({ size = [0.5, 0.4, 0.35] }) => (
    <group>
        {/* Monitör */}
        <mesh position={[0, size[1] + 0.3, 0]} castShadow>
            <boxGeometry args={[0.5, 0.32, 0.04]} />
            <meshStandardMaterial color="#1e293b" roughness={0.4} />
        </mesh>
        <mesh position={[0, size[1] + 0.3, 0.025]}>
            <boxGeometry args={[0.46, 0.28, 0.005]} />
            <meshStandardMaterial color="#0f172a" metalness={0.9} roughness={0.05} />
        </mesh>
        <mesh position={[0, size[1] + 0.12, 0]}>
            <boxGeometry args={[0.04, 0.2, 0.04]} />
            <meshStandardMaterial color="#334155" />
        </mesh>
        {/* Kule */}
        <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color="#1e293b" roughness={0.5} />
        </mesh>
        <mesh position={[0, size[1] * 0.85, size[2] / 2 + 0.005]}>
            <circleGeometry args={[0.02, 16]} />
            <meshBasicMaterial color="#3b82f6" />
        </mesh>
    </group>
);

// 8. Aydınlatma (Tavan lambası)
export const Lighting = ({ size = [0.4, 0.1, 0.4] }) => (
    <group>
        <mesh position={[0, 0, 0]} castShadow>
            <cylinderGeometry args={[size[0] / 2, size[0] / 2 - 0.05, size[1], 16]} />
            <meshStandardMaterial color="#e5e7eb" metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[0, -size[1] / 2, 0]}>
            <circleGeometry args={[size[0] / 2 - 0.05, 32]} />
            <meshBasicMaterial color="#fef9c3" transparent opacity={0.9} />
        </mesh>
        <pointLight position={[0, -0.1, 0]} intensity={0.5} color="#fffbeb" distance={5} />
    </group>
);

// 9. Su Isıtıcı / Şofben
export const WaterHeater = ({ size = [0.5, 1.5, 0.5] }) => (
    <group>
        <mesh position={[0, size[1] / 2, 0]} castShadow>
            <cylinderGeometry args={[size[0] / 2, size[0] / 2, size[1], 16]} />
            <meshStandardMaterial color="#bfdbfe" metalness={0.4} roughness={0.4} />
        </mesh>
        <mesh position={[0, size[1] - 0.08, 0]}>
            <cylinderGeometry args={[0.06, 0.06, 0.08, 8]} />
            <meshStandardMaterial color="#64748b" metalness={0.8} />
        </mesh>
        <mesh position={[size[0] / 4, size[1] / 2, size[0] / 2 + 0.02]}>
            <boxGeometry args={[0.06, 0.08, 0.02]} />
            <meshStandardMaterial color="#1e3a5f" />
        </mesh>
    </group>
);

// 10. Çamaşır Kurutma Makinesi (Dryer)
export const Dryer = ({ size = [0.6, 0.85, 0.6] }) => (
    <group>
        <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow>
            <boxGeometry args={size} />
            <meshStandardMaterial color="#f8fafc" roughness={0.4} />
        </mesh>
        <mesh position={[0, size[1] / 2, size[2] / 2 + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.18, 0.025, 16, 32]} />
            <meshStandardMaterial color="#9ca3af" metalness={0.4} />
        </mesh>
        <mesh position={[0, size[1] / 2, size[2] / 2 + 0.008]}>
            <circleGeometry args={[0.17, 32]} />
            <meshStandardMaterial color="#6b7280" transparent opacity={0.3} />
        </mesh>
        <mesh position={[0.12, size[1] - 0.08, size[2] / 2 + 0.008]}>
            <planeGeometry args={[0.12, 0.06]} />
            <meshStandardMaterial color="#e5e7eb" />
        </mesh>
    </group>
);

// ─── Dispatcher ───────────────────────────────────────────────────────────────
const ProceduralDevices = ({ type, size }) => {
    switch (type) {
        case 'tv':              return <Television size={size} />;
        case 'ac':              return <AirConditioner size={size} />;
        case 'fridge':          return <Fridge size={size} />;
        case 'washing_machine': return <WashingMachine size={size} />;
        case 'dishwasher':      return <Dishwasher size={size} />;
        case 'oven':            return <Oven size={size} />;
        case 'computer':        return <Computer size={size} />;
        case 'lighting':        return <Lighting size={size} />;
        case 'water_heater':    return <WaterHeater size={size} />;
        case 'dryer':           return <Dryer size={size} />;
        // Legacy aliases
        case 'television':      return <Television size={size} />;
        case 'air_conditioner': return <AirConditioner size={size} />;
        default:                return null;
    }
};

export default ProceduralDevices;

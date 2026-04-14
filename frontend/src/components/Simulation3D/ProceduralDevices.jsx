import React from 'react';
import * as THREE from 'three';

/**
 * ProceduralDevices - Prototip Elektronik Aletler
 * Gerçek dosya yüklemeden, Three.js geometrileriyle 
 * gerçekçilik hissi uyandıran modern ev aletleri.
 */

// 1. Televizyon (Duvarda asılı, ince, parlak siyah ekran)
export const Television = ({ size = [1.6, 0.9, 0.05] }) => {
    return (
        <group>
            {/* Arka Panel */}
            <mesh position={[0, 0, -0.01]} castShadow>
                <boxGeometry args={size} />
                <meshStandardMaterial color="#111111" roughness={0.5} />
            </mesh>
            {/* Ekran (Parlak) */}
            <mesh position={[0, 0, 0.02]} castShadow>
                <boxGeometry args={[size[0] - 0.05, size[1] - 0.05, 0.01]} />
                <meshStandardMaterial color="#000000" metalness={0.8} roughness={0.1} />
            </mesh>
            {/* Alt Detay (Logo/Işık alanı) */}
            <mesh position={[0, -size[1] / 2 + 0.02, 0.025]}>
                <sphereGeometry args={[0.01, 8, 8]} />
                <meshBasicMaterial color="#ef4444" />
            </mesh>
        </group>
    );
};

// 2. Klima (Duvar ünitesi, beyaz, hafif kavisli)
export const AirConditioner = ({ size = [0.8, 0.25, 0.2] }) => {
    return (
        <group>
            {/* Gövde */}
            <mesh castShadow>
                <boxGeometry args={size} />
                <meshStandardMaterial color="#f8fafc" roughness={0.3} />
            </mesh>
            {/* Alt Kapak (Hava üfleyici alan) */}
            <mesh position={[0, -size[1] / 2 + 0.02, 0.02]} rotation={[0.2, 0, 0]}>
                <boxGeometry args={[size[0] - 0.04, 0.05, size[2] + 0.01]} />
                <meshStandardMaterial color="#e2e8f0" />
            </mesh>
            {/* Dijital Ekran (Küçük mavi ışık) */}
            <mesh position={[size[0] / 3, 0, size[2] / 2 + 0.005]}>
                <planeGeometry args={[0.08, 0.04]} />
                <meshBasicMaterial color="#38bdf8" transparent opacity={0.6} />
            </mesh>
        </group>
    );
};

// 3. Buzdolabı (Yüksek, çift kapılı, paslanmaz çelik görünümlü)
export const Fridge = ({ size = [0.9, 1.8, 0.7] }) => {
    return (
        <group position={[0, size[1] / 2, 0]}>
            {/* Ana Gövde */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={size} />
                <meshStandardMaterial color="#94a3b8" metalness={0.6} roughness={0.2} />
            </mesh>
            {/* Kapak Ayrımı (Çizgi) */}
            <mesh position={[0, 0.2, size[2] / 2 + 0.005]}>
                <planeGeometry args={[size[0], 0.005]} />
                <meshBasicMaterial color="#475569" />
            </mesh>
            {/* Kulp (Dikey) */}
            <mesh position={[size[0] / 2 - 0.1, 0.4, size[2] / 2 + 0.03]} castShadow>
                <boxGeometry args={[0.03, 0.6, 0.03]} />
                <meshStandardMaterial color="#1e293b" metalness={0.8} />
            </mesh>
        </group>
    );
};

// 4. Çamaşır Makinesi (Beyaz, yuvarlak cam kapak)
export const WashingMachine = ({ size = [0.6, 0.85, 0.6] }) => {
    return (
        <group position={[0, size[1] / 2, 0]}>
            {/* Gövde */}
            <mesh castShadow receiveShadow>
                <boxGeometry args={size} />
                <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
            </mesh>
            {/* Cam Kapak Frame */}
            <mesh position={[0, 0, size[2] / 2 + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.2, 0.03, 16, 32]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.5} />
            </mesh>
            {/* Cam */}
            <mesh position={[0, 0, size[2] / 2 + 0.005]} rotation={[0, 0, 0]}>
                <circleGeometry args={[0.2, 32]} />
                <meshStandardMaterial color="#334155" transparent opacity={0.4} metalness={0.9} roughness={0} />
            </mesh>
            {/* Deterjan Gözü */}
            <mesh position={[-0.15, size[1] / 2 - 0.1, size[2] / 2 + 0.006]}>
                <planeGeometry args={[0.2, 0.1]} />
                <meshStandardMaterial color="#cbd5e1" />
            </mesh>
        </group>
    );
};

const ProceduralDevices = ({ type, size }) => {
    switch (type) {
        case 'television': return <Television size={size} />;
        case 'air_conditioner': return <AirConditioner size={size} />;
        case 'fridge': return <Fridge size={size} />;
        case 'washing_machine': return <WashingMachine size={size} />;
        default: return null;
    }
};

export default ProceduralDevices;

import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { ElectricHubVisual } from './ElectricHub';

/**
 * ProceduralDevices — KWhane cihaz görselleştirmeleri
 * Tüm desteklenen 10 cihaz türü için Three.js geometrisi + idle animasyon.
 *
 * Her cihaz useFrame içinde material/rotation ref'lerine doğrudan yazar;
 * setState yok → React re-render yok. Tüm callback'ler R3F'in tek render
 * döngüsünde batchlenir, device başına maliyet sabittir.
 */

// 1. Televizyon — ekran emissive renk kayması
export const Television = ({ size = [1.2, 0.8, 0.1] }) => {
    const screenRef = useRef();
    useFrame((state) => {
        const mat = screenRef.current;
        if (!mat) return;
        const t = state.clock.elapsedTime;
        mat.emissive.setRGB(
            0.15 + 0.15 * Math.sin(t * 0.7),
            0.10 + 0.12 * Math.sin(t * 0.5 + 1.2),
            0.40 + 0.25 * Math.sin(t * 0.9 + 2.4)
        );
        mat.emissiveIntensity = 1.2 + 0.6 * Math.sin(t * 1.3);
    });
    return (
        <group>
            <mesh position={[0, size[1] / 2, 0]} castShadow>
                <boxGeometry args={size} />
                <meshStandardMaterial color="#111111" roughness={0.5} />
            </mesh>
            <mesh position={[0, size[1] / 2, size[2] / 2 + 0.005]} castShadow>
                <boxGeometry args={[size[0] - 0.05, size[1] - 0.05, 0.005]} />
                <meshStandardMaterial
                    ref={screenRef}
                    color="#000000"
                    metalness={0.9}
                    roughness={0.05}
                    emissive="#223366"
                    emissiveIntensity={0.8}
                />
            </mesh>
            <mesh position={[0, 0.01, 0]}>
                <boxGeometry args={[0.2, 0.02, 0.1]} />
                <meshStandardMaterial color="#1e293b" metalness={0.7} />
            </mesh>
        </group>
    );
};

// 2. Klima — mavi LED nefes alma
export const AirConditioner = ({ size = [0.9, 0.3, 0.3] }) => {
    const ledRef = useRef();
    useFrame((state) => {
        const mat = ledRef.current;
        if (!mat) return;
        const t = state.clock.elapsedTime;
        mat.opacity = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(t * 1.8));
    });
    return (
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
                <planeGeometry args={[0.08, 0.04]} />
                <meshBasicMaterial ref={ledRef} color="#38bdf8" transparent opacity={0.7} />
            </mesh>
        </group>
    );
};

// 3. Buzdolabı — kompresör aktif yeşil LED
export const Fridge = ({ size = [0.7, 1.8, 0.7] }) => {
    const ledRef = useRef();
    useFrame((state) => {
        const mat = ledRef.current;
        if (!mat) return;
        const t = state.clock.elapsedTime;
        mat.emissiveIntensity = 0.8 + 1.0 * (0.5 + 0.5 * Math.sin(t * 2.1));
    });
    return (
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
            <mesh position={[-size[0] / 2 + 0.08, size[1] * 0.78, size[2] / 2 + 0.008]}>
                <circleGeometry args={[0.02, 16]} />
                <meshStandardMaterial
                    ref={ledRef}
                    color="#0a0a0a"
                    emissive="#22c55e"
                    emissiveIntensity={1.2}
                />
            </mesh>
        </group>
    );
};

// 4. Çamaşır Makinesi — tambur dönüşü + program LED
export const WashingMachine = ({ size = [0.6, 0.85, 0.6] }) => {
    const drumRef = useRef();
    const ledRef = useRef();
    useFrame((state, delta) => {
        if (drumRef.current) drumRef.current.rotation.z -= delta * 0.8;
        const mat = ledRef.current;
        if (mat) {
            const t = state.clock.elapsedTime;
            mat.emissiveIntensity = 0.8 + 1.0 * (0.5 + 0.5 * Math.sin(t * 2.6));
        }
    });
    return (
        <group>
            <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={size} />
                <meshStandardMaterial color="#f1f5f9" roughness={0.4} />
            </mesh>
            <mesh position={[0, size[1] / 2, size[2] / 2 + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.18, 0.025, 16, 32]} />
                <meshStandardMaterial color="#cbd5e1" metalness={0.5} />
            </mesh>
            {/* Tambur agitatörü (pencere camının arkasında dönüyor) */}
            <group ref={drumRef} position={[0, size[1] / 2, size[2] / 2 + 0.003]}>
                <mesh>
                    <boxGeometry args={[0.30, 0.012, 0.003]} />
                    <meshStandardMaterial color="#1e293b" />
                </mesh>
                <mesh rotation={[0, 0, Math.PI / 3]}>
                    <boxGeometry args={[0.30, 0.012, 0.003]} />
                    <meshStandardMaterial color="#1e293b" />
                </mesh>
                <mesh rotation={[0, 0, -Math.PI / 3]}>
                    <boxGeometry args={[0.30, 0.012, 0.003]} />
                    <meshStandardMaterial color="#1e293b" />
                </mesh>
            </group>
            <mesh position={[0, size[1] / 2, size[2] / 2 + 0.008]}>
                <circleGeometry args={[0.17, 32]} />
                <meshStandardMaterial color="#334155" transparent opacity={0.35} metalness={0.9} roughness={0} />
            </mesh>
            <mesh position={[-0.12, size[1] - 0.08, size[2] / 2 + 0.008]}>
                <planeGeometry args={[0.15, 0.07]} />
                <meshStandardMaterial color="#cbd5e1" />
            </mesh>
            <mesh position={[-0.12, size[1] - 0.08, size[2] / 2 + 0.012]}>
                <circleGeometry args={[0.015, 16]} />
                <meshStandardMaterial
                    ref={ledRef}
                    color="#0a0a0a"
                    emissive="#38bdf8"
                    emissiveIntensity={1.4}
                />
            </mesh>
        </group>
    );
};

// 5. Bulaşık Makinesi — kontrol paneli LED
export const Dishwasher = ({ size = [0.6, 0.85, 0.6] }) => {
    const ledRef = useRef();
    useFrame((state) => {
        const mat = ledRef.current;
        if (!mat) return;
        const t = state.clock.elapsedTime;
        mat.emissiveIntensity = 0.8 + 1.0 * (0.5 + 0.5 * Math.sin(t * 2.3 + 0.7));
    });
    return (
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
            <mesh position={[-0.15, size[1] - 0.08, size[2] / 2 + 0.011]}>
                <circleGeometry args={[0.018, 16]} />
                <meshStandardMaterial
                    ref={ledRef}
                    color="#0a0a0a"
                    emissive="#22d3ee"
                    emissiveIntensity={1.4}
                />
            </mesh>
        </group>
    );
};

// 6. Fırın — sıcak cam turuncu nabız
export const Oven = ({ size = [0.6, 0.6, 0.6] }) => {
    const glassRef = useRef();
    useFrame((state) => {
        const mat = glassRef.current;
        if (!mat) return;
        const t = state.clock.elapsedTime;
        mat.emissiveIntensity = 0.5 + 0.8 * (0.5 + 0.5 * Math.sin(t * 1.4));
    });
    return (
        <group>
            <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={size} />
                <meshStandardMaterial color="#6b7280" metalness={0.4} roughness={0.5} />
            </mesh>
            <mesh position={[0, size[1] / 2, size[2] / 2 + 0.005]}>
                <boxGeometry args={[size[0] - 0.1, size[1] - 0.15, 0.01]} />
                <meshStandardMaterial
                    ref={glassRef}
                    color="#1a1a1a"
                    transparent
                    opacity={0.6}
                    emissive="#ff6600"
                    emissiveIntensity={0.5}
                />
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
};

// 7. Bilgisayar — monitör ekran renk kayması + güç LED'i
export const Computer = ({ size = [0.5, 0.4, 0.35] }) => {
    const screenRef = useRef();
    const ledRef = useRef();
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const scr = screenRef.current;
        if (scr) {
            scr.emissive.setRGB(
                0.12 + 0.15 * Math.sin(t * 0.6),
                0.14 + 0.12 * Math.sin(t * 0.8 + 1),
                0.35 + 0.20 * Math.sin(t * 0.5 + 2)
            );
            scr.emissiveIntensity = 1.2 + 0.5 * Math.sin(t * 1.1);
        }
        const led = ledRef.current;
        if (led) {
            led.opacity = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin(t * 3.0));
        }
    });
    return (
        <group>
            <mesh position={[0, size[1] + 0.3, 0]} castShadow>
                <boxGeometry args={[0.5, 0.32, 0.04]} />
                <meshStandardMaterial color="#1e293b" roughness={0.4} />
            </mesh>
            <mesh position={[0, size[1] + 0.3, 0.025]}>
                <boxGeometry args={[0.46, 0.28, 0.005]} />
                <meshStandardMaterial
                    ref={screenRef}
                    color="#0f172a"
                    metalness={0.9}
                    roughness={0.05}
                    emissive="#1a3366"
                    emissiveIntensity={0.9}
                />
            </mesh>
            <mesh position={[0, size[1] + 0.12, 0]}>
                <boxGeometry args={[0.04, 0.2, 0.04]} />
                <meshStandardMaterial color="#334155" />
            </mesh>
            <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={size} />
                <meshStandardMaterial color="#1e293b" roughness={0.5} />
            </mesh>
            <mesh position={[0, size[1] * 0.85, size[2] / 2 + 0.005]}>
                <circleGeometry args={[0.025, 16]} />
                <meshBasicMaterial ref={ledRef} color="#3b82f6" transparent opacity={0.9} />
            </mesh>
        </group>
    );
};

// 8. Aydınlatma — hafif flicker + pointLight nabız
export const Lighting = ({ size = [0.4, 0.1, 0.4] }) => {
    const glowRef = useRef();
    const lightRef = useRef();
    useFrame((state) => {
        const t = state.clock.elapsedTime;
        const flicker = 1 + 0.08 * Math.sin(t * 6.0) + 0.05 * Math.sin(t * 11.0);
        if (lightRef.current) lightRef.current.intensity = 0.8 * flicker;
        if (glowRef.current) glowRef.current.opacity = 0.7 + 0.25 * Math.sin(t * 6.0);
    });
    return (
        <group>
            <mesh position={[0, 0, 0]} castShadow>
                <cylinderGeometry args={[size[0] / 2, size[0] / 2 - 0.05, size[1], 16]} />
                <meshStandardMaterial color="#e5e7eb" metalness={0.3} roughness={0.5} />
            </mesh>
            <mesh position={[0, -size[1] / 2, 0]}>
                <circleGeometry args={[size[0] / 2 - 0.05, 32]} />
                <meshBasicMaterial ref={glowRef} color="#fef9c3" transparent opacity={0.9} />
            </mesh>
            <pointLight ref={lightRef} position={[0, -0.1, 0]} intensity={0.5} color="#fffbeb" distance={5} />
        </group>
    );
};

// 9. Su Isıtıcı — gösterge turuncu nabız
export const WaterHeater = ({ size = [0.5, 1.5, 0.5] }) => {
    const ledRef = useRef();
    useFrame((state) => {
        const mat = ledRef.current;
        if (!mat) return;
        const t = state.clock.elapsedTime;
        mat.emissiveIntensity = 0.8 + 1.2 * (0.5 + 0.5 * Math.sin(t * 1.9 + 1.5));
    });
    return (
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
                <meshStandardMaterial
                    ref={ledRef}
                    color="#1e3a5f"
                    emissive="#f97316"
                    emissiveIntensity={0.8}
                />
            </mesh>
        </group>
    );
};

// 10. Kurutucu — tambur dönüşü + LED
export const Dryer = ({ size = [0.6, 0.85, 0.6] }) => {
    const drumRef = useRef();
    const ledRef = useRef();
    useFrame((state, delta) => {
        if (drumRef.current) drumRef.current.rotation.z -= delta * 0.9;
        const mat = ledRef.current;
        if (mat) {
            const t = state.clock.elapsedTime;
            mat.emissiveIntensity = 0.8 + 1.0 * (0.5 + 0.5 * Math.sin(t * 2.4 + 2.0));
        }
    });
    return (
        <group>
            <mesh position={[0, size[1] / 2, 0]} castShadow receiveShadow>
                <boxGeometry args={size} />
                <meshStandardMaterial color="#f8fafc" roughness={0.4} />
            </mesh>
            <mesh position={[0, size[1] / 2, size[2] / 2 + 0.01]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[0.18, 0.025, 16, 32]} />
                <meshStandardMaterial color="#9ca3af" metalness={0.4} />
            </mesh>
            {/* Kurutucu tamburu (2 çubuklu) */}
            <group ref={drumRef} position={[0, size[1] / 2, size[2] / 2 + 0.003]}>
                <mesh>
                    <boxGeometry args={[0.30, 0.012, 0.003]} />
                    <meshStandardMaterial color="#374151" />
                </mesh>
                <mesh rotation={[0, 0, Math.PI / 2]}>
                    <boxGeometry args={[0.30, 0.012, 0.003]} />
                    <meshStandardMaterial color="#374151" />
                </mesh>
            </group>
            <mesh position={[0, size[1] / 2, size[2] / 2 + 0.008]}>
                <circleGeometry args={[0.17, 32]} />
                <meshStandardMaterial color="#6b7280" transparent opacity={0.3} />
            </mesh>
            <mesh position={[0.12, size[1] - 0.08, size[2] / 2 + 0.008]}>
                <planeGeometry args={[0.12, 0.06]} />
                <meshStandardMaterial color="#e5e7eb" />
            </mesh>
            <mesh position={[0.12, size[1] - 0.08, size[2] / 2 + 0.012]}>
                <circleGeometry args={[0.015, 16]} />
                <meshStandardMaterial
                    ref={ledRef}
                    color="#0a0a0a"
                    emissive="#f59e0b"
                    emissiveIntensity={1.4}
                />
            </mesh>
        </group>
    );
};

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

export default React.memo(ProceduralDevices);

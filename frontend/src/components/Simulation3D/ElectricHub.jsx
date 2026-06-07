import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useSceneStore from '../../store/useSceneStore';

export const CABLE_Y = 0.04;

export function getHubConnectPoint(hubRoom) {
    if (!hubRoom) return new THREE.Vector3(0, CABLE_Y, 0);
    const [rx, , rz] = hubRoom.position;
    return new THREE.Vector3(rx, CABLE_Y, rz - hubRoom.size.depth / 2);
}

// ─── Saf görsel bileşen (DraggableObject içinden de kullanılır) ───────────────
export const ElectricHubVisual = () => {
    const ledRef = useRef();

    useFrame(({ clock }) => {
        if (!ledRef.current) return;
        ledRef.current.emissiveIntensity = 0.55 + 0.5 * Math.sin(clock.elapsedTime * 2.1);
    });

    return (
        <>
            {/* ─── Montaj plakası ─────────────────────── */}
            <mesh position={[0, 0.5, -0.012]}>
                <boxGeometry args={[0.54, 1.04, 0.025]} />
                <meshStandardMaterial color="#0f172a" roughness={0.15} metalness={0.95} />
            </mesh>

            {/* ─── Ana kasa ───────────────────────────── */}
            <mesh position={[0, 0.5, 0.06]} castShadow>
                <boxGeometry args={[0.50, 1.00, 0.13]} />
                <meshStandardMaterial color="#1e293b" roughness={0.22} metalness={0.88} />
            </mesh>

            {/* ─── İç panel kapağı ────────────────────── */}
            <mesh position={[0, 0.5, 0.128]}>
                <boxGeometry args={[0.44, 0.90, 0.009]} />
                <meshStandardMaterial color="#334155" roughness={0.2} metalness={0.9} />
            </mesh>

            {/* ─── Kapak yatay çizgisi ────────────────── */}
            <mesh position={[0, 0.5, 0.134]}>
                <boxGeometry args={[0.44, 0.003, 0.005]} />
                <meshStandardMaterial color="#0f172a" />
            </mesh>

            {/* ─── 5 çift sigorta / devre kesici ─────── */}
            {[0.33, 0.175, 0.02, -0.135, -0.29].map((yOff, i) => (
                <group key={i} position={[0, 0.5 + yOff, 0.136]}>
                    <mesh position={[-0.098, 0, 0]}>
                        <boxGeometry args={[0.128, 0.1, 0.007]} />
                        <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.6} />
                    </mesh>
                    <mesh position={[-0.098, 0.026, 0.007]}>
                        <boxGeometry args={[0.075, 0.028, 0.005]} />
                        <meshStandardMaterial color="#64748b" roughness={0.3} />
                    </mesh>
                    <mesh position={[0.098, 0, 0]}>
                        <boxGeometry args={[0.128, 0.1, 0.007]} />
                        <meshStandardMaterial color="#475569" roughness={0.4} metalness={0.6} />
                    </mesh>
                    <mesh position={[0.098, 0.026, 0.007]}>
                        <boxGeometry args={[0.075, 0.028, 0.005]} />
                        <meshStandardMaterial color="#64748b" roughness={0.3} />
                    </mesh>
                </group>
            ))}

            {/* ─── Durum LED'i (yeşil, nefes alır) ───── */}
            <mesh position={[0.185, 0.915, 0.136]}>
                <sphereGeometry args={[0.015, 8, 8]} />
                <meshStandardMaterial
                    ref={ledRef}
                    color="#00ff88"
                    emissive="#00ff88"
                    emissiveIntensity={0.8}
                    roughness={0.1}
                />
            </mesh>

            {/* ─── Alt uyarı şeridi ────────────────────── */}
            <mesh position={[0, 0.065, 0.132]}>
                <boxGeometry args={[0.44, 0.055, 0.007]} />
                <meshStandardMaterial color="#f59e0b" roughness={0.85} />
            </mesh>

            {/* ─── 4 köşe montaj vidası ─────────────────── */}
            {[[-0.22, 0.96], [0.22, 0.96], [-0.22, 0.04], [0.22, 0.04]].map(([sx, sy], i) => (
                <mesh key={i} position={[sx, sy, 0.068]} rotation={[Math.PI / 2, 0, 0]}>
                    <cylinderGeometry args={[0.011, 0.011, 0.007, 6]} />
                    <meshStandardMaterial color="#94a3b8" metalness={0.95} roughness={0.1} />
                </mesh>
            ))}

            {/* ─── Panel çevresi ışığı ─────────────────── */}
            <pointLight
                position={[0, 0.9, 0.25]}
                color="#00ff88"
                intensity={0.25}
                distance={1.8}
                decay={2}
            />
        </>
    );
};

// Hub artık kullanıcı tarafından manuel olarak eklenir; fallback render yok.
const ElectricHub = () => null;

export default ElectricHub;

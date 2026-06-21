import React, { useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import ProceduralDevices from './ProceduralDevices';

/**
 * GhostDevice — Semi-transparent holographic suggestion mesh.
 * Appears after room creation based on room type presets.
 * Clicking opens DeviceCatalogModal filtered to this device type.
 * Hovering reveals a dismiss button.
 */
const GhostDevice = ({ ghost, onGhostClick, onGhostDismiss }) => {
    const groupRef = useRef();
    const [hovered, setHovered] = useState(false);

    // Subtle pulsing scale animation
    useFrame(({ clock }) => {
        if (groupRef.current) {
            const pulse = 1 + Math.sin(clock.elapsedTime * 2.2) * 0.018;
            groupRef.current.scale.set(pulse, pulse, pulse);
        }
    });

    const [x, y, z] = ghost.position;

    return (
        <group
            ref={groupRef}
            position={[x, y, z]}
            onPointerOver={() => setHovered(true)}
            onPointerOut={() => setHovered(false)}
            onClick={(e) => {
                e.stopPropagation();
                onGhostClick(ghost);
            }}
        >
            {/* Ghost mesh — override all materials to be transparent + blue emissive */}
            <GhostMesh size={ghost.size} />

            {/* "Ekle?" chip always visible */}
            <Html
                position={[0, (ghost.size?.[1] || 1) + 0.35, 0]}
                distanceFactor={8}
                center
                style={{ pointerEvents: 'none' }}
            >
                <div style={{
                    background: 'rgba(59,130,246,0.15)',
                    border: '1px solid rgba(59,130,246,0.45)',
                    borderRadius: '999px',
                    padding: '3px 10px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap',
                    userSelect: 'none',
                    backdropFilter: 'blur(6px)',
                }}>
                    <span style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: '#3b82f6',
                        animation: 'ghost-pulse 1.4s ease-in-out infinite',
                        display: 'inline-block',
                        flexShrink: 0,
                    }} />
                    <span style={{ color: '#93c5fd', fontSize: 11, fontWeight: 600, letterSpacing: '0.03em' }}>
                        Ekle?
                    </span>
                </div>
                <style>{`
                    @keyframes ghost-pulse {
                        0%, 100% { opacity: 1; transform: scale(1); }
                        50%       { opacity: 0.4; transform: scale(0.75); }
                    }
                `}</style>
            </Html>

            {/* Dismiss "×" button — only on hover */}
            {hovered && (
                <Html
                    position={[(ghost.size?.[0] || 0.6) / 2 + 0.05, (ghost.size?.[1] || 1) + 0.35, 0]}
                    distanceFactor={8}
                    center
                >
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onGhostDismiss(ghost.id);
                        }}
                        style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: 'rgba(239,68,68,0.25)',
                            border: '1px solid rgba(239,68,68,0.5)',
                            color: '#fca5a5',
                            fontSize: 12,
                            lineHeight: '18px',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            backdropFilter: 'blur(4px)',
                        }}
                        title="Kaldır"
                    >
                        ×
                    </button>
                </Html>
            )}
        </group>
    );
};

/**
 * Inner component that renders ProceduralDevices geometry with ghost materials.
 * We override all meshStandardMaterial via a transparent blue emissive wrapper.
 */
const GhostMesh = ({ size }) => {
    // We wrap ProceduralDevices and use React Three Fiber's material override approach.
    // The simplest robust approach: render a transparent bounding box on top of the device mesh.
    const dimensions = size || [0.6, 0.85, 0.6];
    return (
        <group>
            {/* Device silhouette box (bounding volume) */}
            <mesh position={[0, dimensions[1] / 2, 0]}>
                <boxGeometry args={dimensions} />
                <meshStandardMaterial
                    color="#3b82f6"
                    emissive="#3b82f6"
                    emissiveIntensity={0.35}
                    transparent
                    opacity={0.18}
                    depthWrite={false}
                />
            </mesh>
            {/* Wireframe edge highlight */}
            <mesh position={[0, dimensions[1] / 2, 0]}>
                <boxGeometry args={dimensions} />
                <meshBasicMaterial
                    color="#60a5fa"
                    wireframe
                    transparent
                    opacity={0.45}
                />
            </mesh>
        </group>
    );
};

export default GhostDevice;

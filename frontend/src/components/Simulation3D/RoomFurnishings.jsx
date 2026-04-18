/**
 * RoomFurnishings.jsx — Static decorative furniture for each room type.
 *
 * All geometry is non-interactive (no pointer events, no Zustand hooks).
 * Coordinates are relative to the room center (placed inside RoomBuilder's group).
 * Style: muted earth tones matching the existing ProceduralDevices palette.
 */

import React from 'react';

// ─── Shared material helpers ──────────────────────────────────────────────────
const Wood    = (props) => <meshStandardMaterial color="#7c5c3e" roughness={0.85} {...props} />;
const Fabric  = (props) => <meshStandardMaterial color="#4a5568" roughness={0.95} {...props} />;
const FabricLight = (props) => <meshStandardMaterial color="#94a3b8" roughness={0.9} {...props} />;
const Metal   = (props) => <meshStandardMaterial color="#64748b" metalness={0.7} roughness={0.3} {...props} />;
const Ceramic = (props) => <meshStandardMaterial color="#e2e8f0" roughness={0.4} {...props} />;
const Cabinet = (props) => <meshStandardMaterial color="#9ca3af" roughness={0.6} {...props} />;
const Counter = (props) => <meshStandardMaterial color="#cbd5e1" roughness={0.35} {...props} />;

// ─── Kitchen ──────────────────────────────────────────────────────────────────
const KitchenFurnishings = ({ w, d }) => {
    const cw = Math.max(w - 0.5, 1);   // counter width
    const bz = -(d / 2 - 0.3);         // back wall z

    return (
        <group>
            {/* Counter base */}
            <mesh position={[0, 0.45, bz]} castShadow receiveShadow>
                <boxGeometry args={[cw, 0.9, 0.6]} />
                <Cabinet />
            </mesh>
            {/* Counter top slab */}
            <mesh position={[0, 0.92, bz]} castShadow>
                <boxGeometry args={[cw, 0.04, 0.65]} />
                <Counter />
            </mesh>
            {/* Upper cabinet */}
            <mesh position={[0, 1.9, bz + 0.15]} castShadow>
                <boxGeometry args={[cw * 0.75, 0.7, 0.35]} />
                <Cabinet />
            </mesh>
            {/* Upper cabinet door lines */}
            <mesh position={[0, 1.9, bz + 0.15 + 0.176]}>
                <boxGeometry args={[cw * 0.36, 0.66, 0.005]} />
                <meshStandardMaterial color="#b0bec5" roughness={0.3} />
            </mesh>

            {/* Dining table */}
            <mesh position={[0, 0.375, 0.5]} castShadow receiveShadow>
                <boxGeometry args={[1.2, 0.05, 0.8]} />
                <Wood />
            </mesh>
            {/* Table legs */}
            {[[-0.5, 0.25], [0.5, 0.25], [-0.5, -0.25], [0.5, -0.25]].map(([lx, lz], i) => (
                <mesh key={i} position={[lx, 0.1875, 0.5 + lz]} castShadow>
                    <boxGeometry args={[0.06, 0.75, 0.06]} />
                    <Wood />
                </mesh>
            ))}

            {/* Chair 1 */}
            <group position={[-0.8, 0, 0.5]}>
                <mesh position={[0, 0.225, 0]} castShadow><boxGeometry args={[0.45, 0.05, 0.45]} /><Wood /></mesh>
                <mesh position={[0, 0.525, -0.2]} castShadow><boxGeometry args={[0.45, 0.55, 0.05]} /><Wood /></mesh>
                {[[-0.18, 0.15], [0.18, 0.15], [-0.18, -0.15], [0.18, -0.15]].map(([lx, lz], i) => (
                    <mesh key={i} position={[lx, 0.1125, lz]}><boxGeometry args={[0.04, 0.45, 0.04]} /><Wood /></mesh>
                ))}
            </group>
            {/* Chair 2 */}
            <group position={[0.8, 0, 0.5]}>
                <mesh position={[0, 0.225, 0]} castShadow><boxGeometry args={[0.45, 0.05, 0.45]} /><Wood /></mesh>
                <mesh position={[0, 0.525, -0.2]} castShadow><boxGeometry args={[0.45, 0.55, 0.05]} /><Wood /></mesh>
                {[[-0.18, 0.15], [0.18, 0.15], [-0.18, -0.15], [0.18, -0.15]].map(([lx, lz], i) => (
                    <mesh key={i} position={[lx, 0.1125, lz]}><boxGeometry args={[0.04, 0.45, 0.04]} /><Wood /></mesh>
                ))}
            </group>
        </group>
    );
};

// ─── Living Room ─────────────────────────────────────────────────────────────
const LivingRoomFurnishings = ({ w, d }) => {
    const bz = -(d / 2 - 0.45);   // sofa against back wall

    return (
        <group>
            {/* Sofa base */}
            <mesh position={[0, 0.225, bz]} castShadow receiveShadow>
                <boxGeometry args={[1.8, 0.45, 0.8]} />
                <Fabric />
            </mesh>
            {/* Sofa back */}
            <mesh position={[0, 0.625, bz - 0.325]} castShadow>
                <boxGeometry args={[1.8, 0.5, 0.15]} />
                <Fabric />
            </mesh>
            {/* Sofa left arm */}
            <mesh position={[-0.875, 0.375, bz]} castShadow>
                <boxGeometry args={[0.15, 0.6, 0.8]} />
                <Fabric />
            </mesh>
            {/* Sofa right arm */}
            <mesh position={[0.875, 0.375, bz]} castShadow>
                <boxGeometry args={[0.15, 0.6, 0.8]} />
                <Fabric />
            </mesh>
            {/* Sofa cushions (2) */}
            <mesh position={[-0.45, 0.5, bz]} castShadow>
                <boxGeometry args={[0.75, 0.12, 0.7]} />
                <FabricLight />
            </mesh>
            <mesh position={[0.45, 0.5, bz]} castShadow>
                <boxGeometry args={[0.75, 0.12, 0.7]} />
                <FabricLight />
            </mesh>

            {/* Coffee table */}
            <mesh position={[0, 0.21, bz + 0.9]} castShadow receiveShadow>
                <boxGeometry args={[0.9, 0.04, 0.55]} />
                <Wood />
            </mesh>
            {/* Coffee table legs */}
            {[[-0.38, 0.2], [0.38, 0.2], [-0.38, -0.2], [0.38, -0.2]].map(([lx, lz], i) => (
                <mesh key={i} position={[lx, 0.095, bz + 0.9 + lz]}>
                    <boxGeometry args={[0.05, 0.42, 0.05]} />
                    <Wood />
                </mesh>
            ))}

            {/* Small side table */}
            <mesh position={[w / 2 - 0.4, 0.55, bz]} castShadow receiveShadow>
                <boxGeometry args={[0.4, 0.05, 0.4]} />
                <Wood />
            </mesh>
            <mesh position={[w / 2 - 0.4, 0.275, bz]}>
                <cylinderGeometry args={[0.03, 0.03, 0.55, 8]} />
                <Metal />
            </mesh>
        </group>
    );
};

// ─── Bedroom ─────────────────────────────────────────────────────────────────
const BedroomFurnishings = ({ w, d }) => {
    const bz = -(d / 2 - 1.15);   // bed head against back wall

    return (
        <group>
            {/* Bed frame */}
            <mesh position={[0, 0.1, bz]} castShadow receiveShadow>
                <boxGeometry args={[1.6, 0.2, 2.1]} />
                <Wood />
            </mesh>
            {/* Mattress */}
            <mesh position={[0, 0.325, bz]} castShadow>
                <boxGeometry args={[1.5, 0.25, 2.0]} />
                <FabricLight />
            </mesh>
            {/* Headboard */}
            <mesh position={[0, 0.65, bz - 0.95]} castShadow>
                <boxGeometry args={[1.6, 0.7, 0.1]} />
                <Wood />
            </mesh>
            {/* Pillows */}
            <mesh position={[-0.35, 0.48, bz - 0.7]} castShadow>
                <boxGeometry args={[0.55, 0.12, 0.38]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.8} />
            </mesh>
            <mesh position={[0.35, 0.48, bz - 0.7]} castShadow>
                <boxGeometry args={[0.55, 0.12, 0.38]} />
                <meshStandardMaterial color="#f8fafc" roughness={0.8} />
            </mesh>
            {/* Duvet / blanket */}
            <mesh position={[0, 0.46, bz + 0.3]} castShadow>
                <boxGeometry args={[1.48, 0.08, 1.4]} />
                <meshStandardMaterial color="#dde6f0" roughness={0.95} />
            </mesh>

            {/* Nightstand left */}
            <mesh position={[-1.1, 0.25, bz - 0.6]} castShadow receiveShadow>
                <boxGeometry args={[0.45, 0.5, 0.4]} />
                <Wood />
            </mesh>
            {/* Nightstand right */}
            <mesh position={[1.1, 0.25, bz - 0.6]} castShadow receiveShadow>
                <boxGeometry args={[0.45, 0.5, 0.4]} />
                <Wood />
            </mesh>

            {/* Wardrobe */}
            <mesh position={[w / 2 - 0.95, 1.0, 0]} castShadow receiveShadow>
                <boxGeometry args={[1.8, 2.0, 0.55]} />
                <Cabinet />
            </mesh>
            {/* Wardrobe door lines */}
            <mesh position={[w / 2 - 0.95, 1.0, 0.278]}>
                <boxGeometry args={[0.88, 1.95, 0.004]} />
                <meshStandardMaterial color="#b0bec5" roughness={0.3} />
            </mesh>
        </group>
    );
};

// ─── Bathroom ────────────────────────────────────────────────────────────────
const BathroomFurnishings = ({ w, d }) => {
    const rightX = w / 2 - 0.4;
    const backZ  = -(d / 2 - 0.85);

    return (
        <group>
            {/* Bathtub outer shell */}
            <mesh position={[rightX, 0.275, backZ]} castShadow receiveShadow>
                <boxGeometry args={[0.75, 0.55, 1.6]} />
                <Ceramic />
            </mesh>
            {/* Bathtub inner (dark to simulate hollow) */}
            <mesh position={[rightX, 0.35, backZ]}>
                <boxGeometry args={[0.6, 0.32, 1.45]} />
                <meshStandardMaterial color="#c8d8e8" roughness={0.2} />
            </mesh>
            {/* Bathtub faucet */}
            <mesh position={[rightX, 0.62, backZ - 0.65]}>
                <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} rotation={[0, 0, Math.PI / 2]} />
                <Metal />
            </mesh>

            {/* Toilet base */}
            <mesh position={[-(w / 2 - 0.25), 0.325, -(d / 2 - 0.35)]} castShadow receiveShadow>
                <boxGeometry args={[0.4, 0.4, 0.65]} />
                <Ceramic />
            </mesh>
            {/* Toilet seat */}
            <mesh position={[-(w / 2 - 0.25), 0.525, -(d / 2 - 0.35)]} castShadow>
                <boxGeometry args={[0.38, 0.06, 0.42]} />
                <meshStandardMaterial color="#f1f5f9" roughness={0.3} />
            </mesh>
            {/* Toilet tank */}
            <mesh position={[-(w / 2 - 0.25), 0.65, -(d / 2 - 0.08)]} castShadow>
                <boxGeometry args={[0.36, 0.3, 0.18]} />
                <Ceramic />
            </mesh>

            {/* Sink pedestal */}
            <mesh position={[0, 0.375, -(d / 2 - 0.25)]} castShadow receiveShadow>
                <cylinderGeometry args={[0.1, 0.12, 0.75, 12]} />
                <Ceramic />
            </mesh>
            {/* Sink basin */}
            <mesh position={[0, 0.78, -(d / 2 - 0.25)]} castShadow>
                <boxGeometry args={[0.5, 0.12, 0.38]} />
                <Ceramic />
            </mesh>
            {/* Sink faucet */}
            <mesh position={[0, 0.9, -(d / 2 - 0.32)]}>
                <cylinderGeometry args={[0.015, 0.015, 0.18, 8]} />
                <Metal />
            </mesh>
        </group>
    );
};

// ─── Laundry Room ─────────────────────────────────────────────────────────────
const LaundryFurnishings = ({ w, d }) => {
    const sw = Math.max(w - 0.6, 0.8);
    const bz = -(d / 2 - 0.2);

    return (
        <group>
            {/* Shelf unit back panel */}
            <mesh position={[0, 0.9, bz]} castShadow receiveShadow>
                <boxGeometry args={[sw, 1.8, 0.35]} />
                <Cabinet />
            </mesh>
            {/* 3 shelves */}
            {[0.3, 0.85, 1.45].map((sy, i) => (
                <mesh key={i} position={[0, sy, bz + 0.005]}>
                    <boxGeometry args={[sw - 0.04, 0.025, 0.33]} />
                    <meshStandardMaterial color="#b0bec5" roughness={0.4} />
                </mesh>
            ))}

            {/* Laundry basket */}
            <mesh position={[w / 2 - 0.35, 0.275, d / 2 - 0.35]} castShadow receiveShadow>
                <cylinderGeometry args={[0.2, 0.17, 0.55, 16]} />
                <meshStandardMaterial color="#374151" roughness={0.8} />
            </mesh>
            {/* Basket top rim */}
            <mesh position={[w / 2 - 0.35, 0.56, d / 2 - 0.35]}>
                <torusGeometry args={[0.2, 0.015, 8, 24]} />
                <Metal />
            </mesh>
        </group>
    );
};

// ─── Office ───────────────────────────────────────────────────────────────────
const OfficeFurnishings = ({ w, d }) => {
    const bz = -(d / 2 - 0.32);

    return (
        <group>
            {/* Desk surface */}
            <mesh position={[0, 0.75, bz]} castShadow receiveShadow>
                <boxGeometry args={[1.4, 0.04, 0.6]} />
                <Wood />
            </mesh>
            {/* Desk legs */}
            {[[-0.63, 0.2], [0.63, 0.2], [-0.63, -0.2], [0.63, -0.2]].map(([lx, lz], i) => (
                <mesh key={i} position={[lx, 0.375, bz + lz]} castShadow>
                    <boxGeometry args={[0.05, 0.75, 0.05]} />
                    <Metal />
                </mesh>
            ))}

            {/* Chair seat */}
            <mesh position={[0, 0.48, bz + 0.75]} castShadow receiveShadow>
                <boxGeometry args={[0.5, 0.06, 0.5]} />
                <Fabric />
            </mesh>
            {/* Chair back */}
            <mesh position={[0, 0.78, bz + 0.49]} castShadow>
                <boxGeometry args={[0.5, 0.5, 0.06]} />
                <Fabric />
            </mesh>
            {/* Chair center pole */}
            <mesh position={[0, 0.24, bz + 0.75]}>
                <cylinderGeometry args={[0.03, 0.03, 0.48, 8]} />
                <Metal />
            </mesh>
            {/* Chair star base (5 arms) */}
            {[0, 1, 2, 3, 4].map((i) => {
                const angle = (i / 5) * Math.PI * 2;
                return (
                    <mesh key={i} position={[Math.cos(angle) * 0.2, 0.03, bz + 0.75 + Math.sin(angle) * 0.2]}>
                        <boxGeometry args={[0.04, 0.03, 0.38]} />
                        <Metal />
                    </mesh>
                );
            })}

            {/* Bookshelf */}
            <mesh position={[w / 2 - 0.32, 1.0, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.6, 2.0, 0.3]} />
                <Wood />
            </mesh>
            {/* Bookshelf shelves (4 levels) */}
            {[0.2, 0.7, 1.2, 1.7].map((sy, i) => (
                <mesh key={i} position={[w / 2 - 0.32, sy, 0.005]}>
                    <boxGeometry args={[0.56, 0.02, 0.28]} />
                    <meshStandardMaterial color="#9a7550" roughness={0.7} />
                </mesh>
            ))}
            {/* Books (decorative colored boxes on shelves) */}
            {[
                [w / 2 - 0.46, 0.38, -0.05, 0.1, 0.3, 0.22, '#ef4444'],
                [w / 2 - 0.32, 0.38, -0.05, 0.12, 0.28, 0.22, '#3b82f6'],
                [w / 2 - 0.18, 0.38, -0.05, 0.1, 0.35, 0.22, '#22c55e'],
                [w / 2 - 0.42, 0.88, -0.05, 0.14, 0.3, 0.22, '#f59e0b'],
                [w / 2 - 0.26, 0.88, -0.05, 0.1, 0.32, 0.22, '#8b5cf6'],
            ].map(([bx, by, bz2, bw, bh, bd, col], i) => (
                <mesh key={i} position={[bx, by, bz2]} castShadow>
                    <boxGeometry args={[bw, bh, bd]} />
                    <meshStandardMaterial color={col} roughness={0.8} />
                </mesh>
            ))}
        </group>
    );
};

// ─── Dispatcher ───────────────────────────────────────────────────────────────
const RoomFurnishings = ({ roomType, width = 6, depth = 5, height = 3 }) => {
    const w = width, d = depth, h = height;

    switch (roomType) {
        case 'Mutfak':        return <KitchenFurnishings     w={w} d={d} h={h} />;
        case 'Oturma Odası':  return <LivingRoomFurnishings  w={w} d={d} h={h} />;
        case 'Yatak Odası':   return <BedroomFurnishings     w={w} d={d} h={h} />;
        case 'Banyo':         return <BathroomFurnishings    w={w} d={d} h={h} />;
        case 'Çamaşır Odası': return <LaundryFurnishings     w={w} d={d} h={h} />;
        case 'Ofis':          return <OfficeFurnishings      w={w} d={d} h={h} />;
        default:              return null;
    }
};

export default RoomFurnishings;

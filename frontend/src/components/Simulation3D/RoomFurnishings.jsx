/**
 * RoomFurnishings.jsx — Rich static furniture for every room type.
 *
 * All geometry is non-interactive.
 * Coordinates are relative to the room center (inside RoomBuilder's group).
 * Furniture fills all four walls so rooms look lived-in.
 */

import React from 'react';

// ─── Shared materials ─────────────────────────────────────────────────────────
const Wood      = (p) => <meshStandardMaterial color="#7c5c3e" roughness={0.85} {...p} />;
const WoodLight = (p) => <meshStandardMaterial color="#b08060" roughness={0.8}  {...p} />;
const WoodDark  = (p) => <meshStandardMaterial color="#4a3728" roughness={0.9}  {...p} />;
const Fabric    = (p) => <meshStandardMaterial color="#4a5568" roughness={0.95} {...p} />;
const FabricWarm= (p) => <meshStandardMaterial color="#7c6a54" roughness={0.95} {...p} />;
const FabricLight=(p) => <meshStandardMaterial color="#94a3b8" roughness={0.9}  {...p} />;
const FabricBeige=(p) => <meshStandardMaterial color="#c9b99a" roughness={0.95} {...p} />;
const Metal     = (p) => <meshStandardMaterial color="#64748b" metalness={0.7}  roughness={0.3} {...p} />;
const MetalBright=(p) => <meshStandardMaterial color="#9ab0c0" metalness={0.8}  roughness={0.2} {...p} />;
const Ceramic   = (p) => <meshStandardMaterial color="#e2e8f0" roughness={0.4}  {...p} />;
const Cabinet   = (p) => <meshStandardMaterial color="#9ca3af" roughness={0.6}  {...p} />;
const CabinetWarm=(p) => <meshStandardMaterial color="#a89070" roughness={0.65} {...p} />;
const Counter   = (p) => <meshStandardMaterial color="#cbd5e1" roughness={0.35} {...p} />;
const White     = (p) => <meshStandardMaterial color="#f8fafc" roughness={0.6}  {...p} />;
const Glass     = (p) => <meshStandardMaterial color="#a8c8e0" transparent opacity={0.25} roughness={0.05} {...p} />;
const Rug       = (p) => <meshStandardMaterial color="#8b6f47" roughness={1.0}  {...p} />;
const RugBlue   = (p) => <meshStandardMaterial color="#3d5a80" roughness={1.0}  {...p} />;
const RugGrey   = (p) => <meshStandardMaterial color="#6b7280" roughness={1.0}  {...p} />;
const Plant     = (p) => <meshStandardMaterial color="#2d6a4f" roughness={0.9}  {...p} />;
const Pot       = (p) => <meshStandardMaterial color="#6b4c2a" roughness={0.7}  {...p} />;
const Lamp      = (p) => <meshStandardMaterial color="#fef3c7" emissive="#fef3c7" emissiveIntensity={0.3} roughness={0.5} {...p} />;
const WallArt   = (p) => <meshStandardMaterial color="#334155" roughness={0.5}  {...p} />;
const Frame     = (p) => <meshStandardMaterial color="#4a3728" roughness={0.8}  {...p} />;
const Curtain   = (p) => <meshStandardMaterial color="#c0b090" roughness={0.95} side={2} {...p} />;

// ─── Small shared pieces ──────────────────────────────────────────────────────

/** A potted plant (sphere foliage + cylinder pot) */
const PlantDecor = ({ position = [0, 0, 0], scale = 1 }) => (
    <group position={position}>
        <mesh position={[0, 0.18 * scale, 0]}>
            <cylinderGeometry args={[0.1 * scale, 0.08 * scale, 0.22 * scale, 10]} />
            <Pot />
        </mesh>
        <mesh position={[0, 0.42 * scale, 0]}>
            <sphereGeometry args={[0.18 * scale, 8, 6]} />
            <Plant />
        </mesh>
        <mesh position={[-0.06 * scale, 0.52 * scale, 0.08 * scale]}>
            <sphereGeometry args={[0.1 * scale, 6, 5]} />
            <Plant />
        </mesh>
    </group>
);

/** Tall floor plant */
const FloorPlant = ({ position = [0, 0, 0] }) => (
    <group position={position}>
        <mesh position={[0, 0.22, 0]}>
            <cylinderGeometry args={[0.15, 0.12, 0.44, 10]} />
            <Pot />
        </mesh>
        <mesh position={[0, 0.65, 0]}>
            <sphereGeometry args={[0.28, 8, 6]} />
            <Plant />
        </mesh>
        <mesh position={[0.15, 0.8, 0.05]}>
            <sphereGeometry args={[0.16, 6, 5]} />
            <Plant />
        </mesh>
        <mesh position={[-0.12, 0.75, 0.1]}>
            <sphereGeometry args={[0.13, 6, 5]} />
            <Plant />
        </mesh>
    </group>
);

/** Table lamp (cylinder shade + pole) */
const TableLamp = ({ position = [0, 0, 0] }) => (
    <group position={position}>
        <mesh position={[0, 0.06, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.12, 8]} />
            <Metal />
        </mesh>
        <mesh position={[0, 0.26, 0]}>
            <cylinderGeometry args={[0.01, 0.01, 0.28, 8]} />
            <Metal />
        </mesh>
        <mesh position={[0, 0.45, 0]}>
            <cylinderGeometry args={[0.12, 0.08, 0.2, 12]} />
            <Lamp />
        </mesh>
    </group>
);

/** Floor lamp */
const FloorLamp = ({ position = [0, 0, 0] }) => (
    <group position={position}>
        <mesh position={[0, 0.04, 0]}>
            <cylinderGeometry args={[0.14, 0.14, 0.06, 12]} />
            <Metal />
        </mesh>
        <mesh position={[0, 0.9, 0]}>
            <cylinderGeometry args={[0.025, 0.025, 1.7, 8]} />
            <Metal />
        </mesh>
        <mesh position={[0, 1.78, 0]}>
            <cylinderGeometry args={[0.22, 0.14, 0.3, 16]} />
            <Lamp />
        </mesh>
    </group>
);

/** Wall-hung picture frame */
const WallFrame = ({ position = [0, 0, 0], w = 0.5, h = 0.4, rotation = [0, 0, 0] }) => (
    <group position={position} rotation={rotation}>
        <mesh>
            <boxGeometry args={[w + 0.06, h + 0.06, 0.04]} />
            <Frame />
        </mesh>
        <mesh position={[0, 0, 0.022]}>
            <boxGeometry args={[w, h, 0.01]} />
            <meshStandardMaterial color="#1e3a5f" roughness={0.5} />
        </mesh>
    </group>
);

/** Thin rug (flat plane slightly above floor) */
const AreaRug = ({ position = [0, 0, 0], w = 2, d = 1.4, color = '#8b6f47' }) => (
    <mesh position={[position[0], 0.005, position[2]]} receiveShadow rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={color} roughness={1.0} />
    </mesh>
);

/** Curtain panel (flat rectangle against a wall) */
const CurtainPanel = ({ position = [0, 0, 0], w = 0.5, h = 2.2, rotation = [0, 0, 0] }) => (
    <group position={position} rotation={rotation}>
        {/* Rod */}
        <mesh position={[0, h / 2 + 0.06, 0]}>
            <cylinderGeometry args={[0.015, 0.015, w + 0.1, 8]} rotation={[0, 0, Math.PI / 2]} />
            <Metal />
        </mesh>
        {/* Fabric */}
        <mesh>
            <boxGeometry args={[w, h, 0.04]} />
            <Curtain />
        </mesh>
    </group>
);

// ─────────────────────────────────────────────────────────────────────────────
// KITCHEN
// ─────────────────────────────────────────────────────────────────────────────
const KitchenFurnishings = ({ w, d }) => {
    const cw  = Math.max(w - 0.5, 1.5);
    const bz  = -(d / 2 - 0.32);   // back wall
    const fz  = d / 2 - 0.32;      // front wall
    const rx  = w / 2 - 0.32;      // right wall
    const lx  = -(w / 2 - 0.32);   // left wall

    return (
        <group>
            {/* ── Back-wall kitchen counter (L left + corner + side) ── */}
            {/* Main counter base */}
            <mesh position={[0, 0.45, bz]} castShadow receiveShadow>
                <boxGeometry args={[cw, 0.9, 0.62]} />
                <CabinetWarm />
            </mesh>
            {/* Counter top */}
            <mesh position={[0, 0.925, bz]} castShadow>
                <boxGeometry args={[cw, 0.04, 0.67]} />
                <Counter />
            </mesh>
            {/* Backsplash tiles */}
            <mesh position={[0, 1.35, bz - 0.29]}>
                <boxGeometry args={[cw, 0.85, 0.01]} />
                <meshStandardMaterial color="#e8eef4" roughness={0.2} />
            </mesh>

            {/* Sink cutout illusion (dark inset) */}
            <mesh position={[cw / 2 - 0.6, 0.94, bz]}>
                <boxGeometry args={[0.55, 0.05, 0.42]} />
                <meshStandardMaterial color="#7fb3cc" roughness={0.15} />
            </mesh>
            {/* Faucet */}
            <mesh position={[cw / 2 - 0.6, 1.1, bz - 0.19]}>
                <cylinderGeometry args={[0.015, 0.015, 0.3, 8]} />
                <MetalBright />
            </mesh>
            <mesh position={[cw / 2 - 0.6, 1.25, bz - 0.06]}>
                <boxGeometry args={[0.02, 0.04, 0.28]} />
                <MetalBright />
            </mesh>

            {/* Stove burner circles */}
            {[[-0.18, 0], [0.18, 0], [-0.18, 0.16], [0.18, 0.16]].map(([ox, oz], i) => (
                <mesh key={i} position={[ox, 0.948, bz + oz]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[0.055, 0.085, 16]} />
                    <meshStandardMaterial color="#1f2937" roughness={0.5} />
                </mesh>
            ))}

            {/* Upper cabinets */}
            <mesh position={[0, 1.92, bz - 0.15]} castShadow>
                <boxGeometry args={[cw, 0.72, 0.38]} />
                <CabinetWarm />
            </mesh>
            {/* Cabinet door dividers */}
            {[-cw / 4, cw / 4].map((ox, i) => (
                <mesh key={i} position={[ox, 1.92, bz - 0.15 + 0.192]}>
                    <boxGeometry args={[0.01, 0.68, 0.01]} />
                    <meshStandardMaterial color="#8a7560" roughness={0.5} />
                </mesh>
            ))}

            {/* Extractor hood */}
            <mesh position={[0, 1.75, bz - 0.12]}>
                <boxGeometry args={[0.7, 0.12, 0.44]} />
                <meshStandardMaterial color="#6b7280" metalness={0.5} roughness={0.3} />
            </mesh>

            {/* Right-wall counter extension (forms L) */}
            <mesh position={[rx, 0.45, -0.2]} castShadow receiveShadow>
                <boxGeometry args={[0.62, 0.9, Math.min(d * 0.5, 2)]} />
                <CabinetWarm />
            </mesh>
            <mesh position={[rx, 0.925, -0.2]}>
                <boxGeometry args={[0.67, 0.04, Math.min(d * 0.5, 2)]} />
                <Counter />
            </mesh>

            {/* Small items on counter */}
            {/* Kettle */}
            <mesh position={[lx + 0.35, 0.99, bz]}>
                <cylinderGeometry args={[0.1, 0.08, 0.24, 12]} />
                <meshStandardMaterial color="#334155" metalness={0.5} roughness={0.3} />
            </mesh>
            {/* Cutting board */}
            <mesh position={[-0.1, 0.94, bz]}>
                <boxGeometry args={[0.36, 0.02, 0.25]} />
                <WoodLight />
            </mesh>
            {/* Fruit bowl */}
            <mesh position={[0.3, 0.94, bz]}>
                <cylinderGeometry args={[0.14, 0.1, 0.08, 12]} />
                <meshStandardMaterial color="#e8d5b0" roughness={0.5} />
            </mesh>
            {/* Apple in bowl */}
            <mesh position={[0.3, 1.01, bz]}>
                <sphereGeometry args={[0.055, 8, 6]} />
                <meshStandardMaterial color="#c53030" roughness={0.6} />
            </mesh>

            {/* Dining table */}
            <mesh position={[0, 0.375, fz - 0.6]} castShadow receiveShadow>
                <boxGeometry args={[1.3, 0.06, 0.9]} />
                <WoodLight />
            </mesh>
            {/* Table legs */}
            {[[-0.55, 0.33], [0.55, 0.33], [-0.55, -0.33], [0.55, -0.33]].map(([lx2, lz2], i) => (
                <mesh key={i} position={[lx2, 0.19, fz - 0.6 + lz2]} castShadow>
                    <boxGeometry args={[0.07, 0.75, 0.07]} />
                    <WoodDark />
                </mesh>
            ))}
            {/* 4 chairs */}
            {[[-0.82, fz - 0.6, 0], [0.82, fz - 0.6, 0],
              [0, fz - 0.1, Math.PI], [0, fz - 1.1, 0]].map(([cx, cz, rot], i) => (
                <group key={i} position={[cx, 0, cz]} rotation={[0, rot, 0]}>
                    <mesh position={[0, 0.24, 0]} castShadow>
                        <boxGeometry args={[0.44, 0.05, 0.44]} />
                        <FabricBeige />
                    </mesh>
                    <mesh position={[0, 0.54, -0.19]} castShadow>
                        <boxGeometry args={[0.44, 0.55, 0.06]} />
                        <WoodDark />
                    </mesh>
                    {[[-0.17, 0.14], [0.17, 0.14], [-0.17, -0.14], [0.17, -0.14]].map(([lx3, lz3], j) => (
                        <mesh key={j} position={[lx3, 0.115, lz3]}>
                            <boxGeometry args={[0.04, 0.47, 0.04]} />
                            <WoodDark />
                        </mesh>
                    ))}
                </group>
            ))}

            {/* Rug under dining table */}
            <AreaRug position={[0, 0, fz - 0.6]} w={1.8} d={1.4} color="#c9b18a" />

            {/* Window curtains on right side */}
            <CurtainPanel position={[rx + 0.01, 1.2, 0.6]} w={0.4} h={2.0} rotation={[0, Math.PI / 2, 0]} />

            {/* Small plant on counter corner */}
            <PlantDecor position={[lx + 0.2, 0.96, bz + 0.05]} scale={0.7} />
        </group>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// LIVING ROOM
// ─────────────────────────────────────────────────────────────────────────────
const LivingRoomFurnishings = ({ w, d }) => {
    const bz = -(d / 2 - 0.48);
    const fz = d / 2 - 0.5;
    const rx = w / 2 - 0.5;
    const lx = -(w / 2 - 0.5);

    const sofaW = Math.min(w - 1.0, 2.4);

    return (
        <group>
            {/* ── Large area rug ── */}
            <AreaRug position={[0, 0, bz + 1.6]} w={sofaW + 1.0} d={2.2} color="#3d5a80" />

            {/* ── 3-seat sofa ── */}
            {/* Base */}
            <mesh position={[0, 0.22, bz]} castShadow receiveShadow>
                <boxGeometry args={[sofaW, 0.44, 0.92]} />
                <FabricWarm />
            </mesh>
            {/* Back */}
            <mesh position={[0, 0.64, bz - 0.38]} castShadow>
                <boxGeometry args={[sofaW, 0.52, 0.14]} />
                <FabricWarm />
            </mesh>
            {/* Left arm */}
            <mesh position={[-sofaW / 2 + 0.08, 0.38, bz]} castShadow>
                <boxGeometry args={[0.16, 0.62, 0.92]} />
                <FabricWarm />
            </mesh>
            {/* Right arm */}
            <mesh position={[sofaW / 2 - 0.08, 0.38, bz]} castShadow>
                <boxGeometry args={[0.16, 0.62, 0.92]} />
                <FabricWarm />
            </mesh>
            {/* 3 seat cushions */}
            {[-sofaW / 3 + 0.04, 0, sofaW / 3 - 0.04].map((ox, i) => (
                <mesh key={i} position={[ox, 0.5, bz + 0.02]} castShadow>
                    <boxGeometry args={[sofaW / 3 - 0.12, 0.14, 0.8]} />
                    <FabricBeige />
                </mesh>
            ))}
            {/* Back cushions */}
            {[-sofaW / 3 + 0.04, sofaW / 3 - 0.04].map((ox, i) => (
                <mesh key={i} position={[ox, 0.6, bz - 0.28]} castShadow>
                    <boxGeometry args={[0.38, 0.38, 0.12]} />
                    <FabricLight />
                </mesh>
            ))}
            {/* Decorative throw */}
            <mesh position={[sofaW / 2 - 0.35, 0.52, bz + 0.1]} rotation={[0.1, 0.2, 0.3]}>
                <boxGeometry args={[0.4, 0.04, 0.55]} />
                <meshStandardMaterial color="#c0392b" roughness={1.0} />
            </mesh>

            {/* ── Armchair left ── */}
            <group position={[lx + 0.05, 0, bz + 0.6]} rotation={[0, 0.4, 0]}>
                <mesh position={[0, 0.22, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.76, 0.44, 0.76]} />
                    <Fabric />
                </mesh>
                <mesh position={[0, 0.6, -0.3]} castShadow>
                    <boxGeometry args={[0.76, 0.5, 0.14]} />
                    <Fabric />
                </mesh>
                <mesh position={[-0.31, 0.35, 0]} castShadow>
                    <boxGeometry args={[0.14, 0.56, 0.76]} />
                    <Fabric />
                </mesh>
                <mesh position={[0.31, 0.35, 0]} castShadow>
                    <boxGeometry args={[0.14, 0.56, 0.76]} />
                    <Fabric />
                </mesh>
                <mesh position={[0, 0.5, 0.02]} castShadow>
                    <boxGeometry args={[0.62, 0.14, 0.68]} />
                    <FabricBeige />
                </mesh>
            </group>

            {/* ── Coffee table ── */}
            <mesh position={[0, 0.22, bz + 1.1]} castShadow receiveShadow>
                <boxGeometry args={[1.1, 0.05, 0.65]} />
                <WoodLight />
            </mesh>
            {/* Lower shelf */}
            <mesh position={[0, 0.1, bz + 1.1]}>
                <boxGeometry args={[0.95, 0.02, 0.52]} />
                <WoodLight />
            </mesh>
            {[[-0.47, 0.27], [0.47, 0.27], [-0.47, -0.27], [0.47, -0.27]].map(([lx2, lz2], i) => (
                <mesh key={i} position={[lx2, 0.11, bz + 1.1 + lz2]}>
                    <boxGeometry args={[0.05, 0.44, 0.05]} />
                    <WoodDark />
                </mesh>
            ))}
            {/* Coffee table items */}
            {/* Books stack */}
            <mesh position={[-0.25, 0.255, bz + 1.1]}>
                <boxGeometry args={[0.24, 0.04, 0.18]} />
                <meshStandardMaterial color="#1d4ed8" roughness={0.8} />
            </mesh>
            <mesh position={[-0.25, 0.285, bz + 1.1]}>
                <boxGeometry args={[0.22, 0.03, 0.16]} />
                <meshStandardMaterial color="#c53030" roughness={0.8} />
            </mesh>
            {/* Candle */}
            <mesh position={[0.22, 0.27, bz + 1.1]}>
                <cylinderGeometry args={[0.04, 0.04, 0.1, 8]} />
                <meshStandardMaterial color="#f3e5c0" roughness={0.7} />
            </mesh>

            {/* ── TV stand / entertainment unit ── */}
            <mesh position={[0, 0.2, fz - 0.01]} castShadow receiveShadow>
                <boxGeometry args={[Math.min(w - 0.8, 2.6), 0.4, 0.42]} />
                <WoodDark />
            </mesh>
            {/* TV stand top */}
            <mesh position={[0, 0.42, fz - 0.01]}>
                <boxGeometry args={[Math.min(w - 0.8, 2.6), 0.03, 0.44]} />
                <meshStandardMaterial color="#334155" roughness={0.3} />
            </mesh>
            {/* TV panel (thin dark slab) */}
            <mesh position={[0, 1.1, fz - 0.06]} castShadow>
                <boxGeometry args={[Math.min(w - 1.2, 1.8), 1.0, 0.08]} />
                <meshStandardMaterial color="#111827" roughness={0.2} metalness={0.3} />
            </mesh>
            {/* TV screen */}
            <mesh position={[0, 1.1, fz - 0.01]}>
                <boxGeometry args={[Math.min(w - 1.24, 1.74), 0.94, 0.01]} />
                <meshStandardMaterial color="#0f172a" roughness={0.05} metalness={0.1} />
            </mesh>
            {/* TV stand doors */}
            <mesh position={[0, 0.2, fz + 0.2]}>
                <boxGeometry args={[Math.min(w - 0.8, 2.6) - 0.04, 0.36, 0.005]} />
                <meshStandardMaterial color="#2a1f14" roughness={0.5} />
            </mesh>

            {/* ── Side table + lamp right ── */}
            <mesh position={[rx - 0.01, 0.55, bz + 0.05]} castShadow receiveShadow>
                <boxGeometry args={[0.44, 0.05, 0.44]} />
                <WoodLight />
            </mesh>
            <mesh position={[rx - 0.01, 0.275, bz + 0.05]}>
                <cylinderGeometry args={[0.03, 0.03, 0.55, 8]} />
                <Metal />
            </mesh>
            <TableLamp position={[rx - 0.01, 0.55, bz + 0.05]} />

            {/* ── Floor lamp left ── */}
            <FloorLamp position={[lx + 0.18, 0, fz - 0.22]} />

            {/* ── Large plants ── */}
            <FloorPlant position={[rx - 0.22, 0, fz - 0.28]} />
            <FloorPlant position={[lx + 0.2, 0, bz + 0.1]} />

            {/* ── Wall frames (back wall above sofa) ── */}
            <WallFrame position={[-0.4, 1.8, bz - 0.47]} w={0.55} h={0.4} />
            <WallFrame position={[0.28, 1.85, bz - 0.47]} w={0.3} h={0.45} />
            <WallFrame position={[-0.4, 1.8, bz - 0.47]} w={0.55} h={0.4} />

            {/* ── Curtains on front wall ── */}
            <CurtainPanel position={[lx + 0.22, 1.2, fz + 0.01]} w={0.4} h={2.0} rotation={[0, Math.PI / 2, 0]} />
            <CurtainPanel position={[rx - 0.22, 1.2, fz + 0.01]} w={0.4} h={2.0} rotation={[0, Math.PI / 2, 0]} />

            {/* ── Small decorative shelf right wall ── */}
            <mesh position={[rx - 0.01, 1.5, -0.3]}>
                <boxGeometry args={[0.06, 0.04, 0.7]} />
                <WoodDark />
            </mesh>
            <PlantDecor position={[rx - 0.04, 1.55, -0.15]} scale={0.55} />
        </group>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// BEDROOM
// ─────────────────────────────────────────────────────────────────────────────
const BedroomFurnishings = ({ w, d, h }) => {
    const bz  = -(d / 2 - 1.2);
    const rx  = w / 2 - 0.55;
    const lx  = -(w / 2 - 0.55);

    return (
        <group>
            {/* ── Rug under bed ── */}
            <AreaRug position={[0, 0, bz + 0.5]} w={2.2} d={2.8} color="#7c5c8a" />

            {/* ── Bed frame ── */}
            <mesh position={[0, 0.12, bz]} castShadow receiveShadow>
                <boxGeometry args={[1.65, 0.22, 2.15]} />
                <WoodDark />
            </mesh>
            {/* Mattress */}
            <mesh position={[0, 0.34, bz]} castShadow>
                <boxGeometry args={[1.55, 0.28, 2.05]} />
                <meshStandardMaterial color="#e8e0d5" roughness={0.85} />
            </mesh>
            {/* Headboard */}
            <mesh position={[0, 0.7, bz - 0.98]} castShadow>
                <boxGeometry args={[1.65, 0.82, 0.1]} />
                <FabricWarm />
            </mesh>
            {/* Headboard padded panel */}
            <mesh position={[0, 0.7, bz - 0.93]}>
                <boxGeometry args={[1.5, 0.7, 0.06]} />
                <meshStandardMaterial color="#9b8478" roughness={0.9} />
            </mesh>
            {/* Duvet */}
            <mesh position={[0, 0.5, bz + 0.25]} castShadow>
                <boxGeometry args={[1.52, 0.12, 1.55]} />
                <meshStandardMaterial color="#dce8f0" roughness={0.95} />
            </mesh>
            {/* Duvet fold */}
            <mesh position={[0, 0.52, bz - 0.45]}>
                <boxGeometry args={[1.52, 0.1, 0.18]} />
                <meshStandardMaterial color="#c5d8e8" roughness={0.95} />
            </mesh>
            {/* 2 Pillows */}
            <mesh position={[-0.37, 0.51, bz - 0.75]} castShadow>
                <boxGeometry args={[0.58, 0.14, 0.4]} />
                <White />
            </mesh>
            <mesh position={[0.37, 0.51, bz - 0.75]} castShadow>
                <boxGeometry args={[0.58, 0.14, 0.4]} />
                <meshStandardMaterial color="#f0e8e0" roughness={0.8} />
            </mesh>
            {/* Decorative pillow center */}
            <mesh position={[0, 0.53, bz - 0.68]} castShadow>
                <boxGeometry args={[0.35, 0.18, 0.32]} />
                <meshStandardMaterial color="#8b6f9a" roughness={0.9} />
            </mesh>
            {/* Bed footboard */}
            <mesh position={[0, 0.32, bz + 1.12]} castShadow>
                <boxGeometry args={[1.65, 0.42, 0.08]} />
                <WoodDark />
            </mesh>

            {/* ── Nightstands ── */}
            <mesh position={[-1.12, 0.28, bz - 0.55]} castShadow receiveShadow>
                <boxGeometry args={[0.48, 0.56, 0.42]} />
                <WoodDark />
            </mesh>
            <mesh position={[1.12, 0.28, bz - 0.55]} castShadow receiveShadow>
                <boxGeometry args={[0.48, 0.56, 0.42]} />
                <WoodDark />
            </mesh>
            {/* Drawer line */}
            <mesh position={[-1.12, 0.26, bz - 0.34]}>
                <boxGeometry args={[0.4, 0.18, 0.005]} />
                <meshStandardMaterial color="#3d2e1e" roughness={0.5} />
            </mesh>
            <mesh position={[1.12, 0.26, bz - 0.34]}>
                <boxGeometry args={[0.4, 0.18, 0.005]} />
                <meshStandardMaterial color="#3d2e1e" roughness={0.5} />
            </mesh>
            {/* Table lamps on nightstands */}
            <TableLamp position={[-1.12, 0.56, bz - 0.55]} />
            <TableLamp position={[1.12, 0.56, bz - 0.55]} />

            {/* ── Wardrobe (left wall) ── */}
            <mesh position={[lx - 0.01, 1.1, -0.05]} castShadow receiveShadow>
                <boxGeometry args={[0.62, 2.2, 1.8]} />
                <Cabinet />
            </mesh>
            {/* Wardrobe mirror door */}
            <mesh position={[lx + 0.3, 1.1, -0.05]}>
                <boxGeometry args={[0.02, 2.15, 1.75]} />
                <meshStandardMaterial color="#c8d8e0" metalness={0.8} roughness={0.05} />
            </mesh>
            {/* Wardrobe handle */}
            <mesh position={[lx + 0.29, 1.1, 0.5]}>
                <cylinderGeometry args={[0.015, 0.015, 0.2, 8]} rotation={[Math.PI / 2, 0, 0]} />
                <MetalBright />
            </mesh>

            {/* ── Dresser (right wall) ── */}
            <mesh position={[rx + 0.01, 0.5, bz + 0.8]} castShadow receiveShadow>
                <boxGeometry args={[0.58, 1.0, 1.1]} />
                <WoodDark />
            </mesh>
            {/* 4 drawers */}
            {[0.12, 0.36, 0.6, 0.84].map((sy, i) => (
                <mesh key={i} position={[rx + 0.3, sy, bz + 0.8]}>
                    <boxGeometry args={[0.005, 0.2, 1.0]} />
                    <meshStandardMaterial color="#2a1f14" roughness={0.5} />
                </mesh>
            ))}
            {/* Drawer handles */}
            {[0.12, 0.36, 0.6, 0.84].map((sy, i) => (
                <mesh key={i} position={[rx + 0.29, sy, bz + 0.8]}>
                    <cylinderGeometry args={[0.012, 0.012, 0.14, 8]} rotation={[Math.PI / 2, 0, 0]} />
                    <MetalBright />
                </mesh>
            ))}
            {/* Mirror above dresser */}
            <mesh position={[rx + 0.01, 1.65, bz + 0.78]}>
                <boxGeometry args={[0.06, 0.8, 0.7]} />
                <Frame />
            </mesh>
            <mesh position={[rx - 0.01, 1.65, bz + 0.78]}>
                <boxGeometry args={[0.02, 0.74, 0.64]} />
                <meshStandardMaterial color="#c8d8e4" metalness={0.8} roughness={0.05} />
            </mesh>

            {/* ── Desk corner (study nook) ── */}
            <mesh position={[rx + 0.01, 0.76, d / 2 - 0.38]} castShadow receiveShadow>
                <boxGeometry args={[0.58, 0.04, 0.8]} />
                <WoodLight />
            </mesh>
            {/* Desk lamp */}
            <mesh position={[rx - 0.08, 0.8, d / 2 - 0.55]}>
                <cylinderGeometry args={[0.01, 0.01, 0.32, 6]} />
                <Metal />
            </mesh>
            <mesh position={[rx - 0.08, 0.96, d / 2 - 0.55]}>
                <cylinderGeometry args={[0.08, 0.05, 0.13, 10]} />
                <Lamp />
            </mesh>

            {/* ── Wall art ── */}
            <WallFrame position={[-0.4, 1.7, bz - 1.15]} w={0.6} h={0.5} />
            <WallFrame position={[0.36, 1.72, bz - 1.15]} w={0.35} h={0.5} />

            {/* ── Curtains ── */}
            <CurtainPanel position={[lx + 0.31, 1.3, 0.5]} w={0.45} h={1.9} rotation={[0, Math.PI / 2, 0]} />

            {/* ── Floor plant ── */}
            <FloorPlant position={[lx + 0.26, 0, d / 2 - 0.28]} />

            {/* ── Rug by bed on each side ── */}
            <AreaRug position={[-1.12, 0, bz + 0.25]} w={0.5} d={1.0} color="#8b7050" />
            <AreaRug position={[1.12, 0, bz + 0.25]} w={0.5} d={1.0} color="#8b7050" />
        </group>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// BATHROOM
// ─────────────────────────────────────────────────────────────────────────────
const BathroomFurnishings = ({ w, d }) => {
    const rx   = w / 2 - 0.42;
    const lx   = -(w / 2 - 0.42);
    const bz   = -(d / 2 - 0.46);
    const fz   = d / 2 - 0.46;

    return (
        <group>
            {/* ── Bathtub ── */}
            <mesh position={[rx, 0.28, 0]} castShadow receiveShadow>
                <boxGeometry args={[0.78, 0.56, 1.65]} />
                <Ceramic />
            </mesh>
            {/* Inner basin */}
            <mesh position={[rx, 0.36, 0]}>
                <boxGeometry args={[0.62, 0.36, 1.5]} />
                <meshStandardMaterial color="#b8d4e8" roughness={0.15} />
            </mesh>
            {/* Faucet */}
            <mesh position={[rx - 0.32, 0.62, -0.65]}>
                <cylinderGeometry args={[0.022, 0.022, 0.14, 8]} />
                <MetalBright />
            </mesh>
            {/* Spout */}
            <mesh position={[rx - 0.32, 0.69, -0.58]}>
                <boxGeometry args={[0.025, 0.025, 0.18]} />
                <MetalBright />
            </mesh>
            {/* Soap dish on tub edge */}
            <mesh position={[rx - 0.34, 0.59, 0.1]}>
                <boxGeometry args={[0.12, 0.03, 0.1]} />
                <meshStandardMaterial color="#f0f4f8" roughness={0.3} />
            </mesh>
            {/* Shower head rail */}
            <mesh position={[rx - 0.33, 1.8, 0]}>
                <cylinderGeometry args={[0.012, 0.012, 1.5, 8]} />
                <MetalBright />
            </mesh>
            {/* Shower head */}
            <mesh position={[rx - 0.33, 2.0, 0]}>
                <cylinderGeometry args={[0.07, 0.05, 0.06, 10]} rotation={[Math.PI / 6, 0, 0]} />
                <MetalBright />
            </mesh>
            {/* Glass screen */}
            <mesh position={[rx - 0.35, 1.1, -0.85]}>
                <boxGeometry args={[0.06, 2.2, 0.55]} />
                <Glass />
            </mesh>

            {/* ── Toilet ── */}
            <mesh position={[lx, 0.33, bz]} castShadow receiveShadow>
                <boxGeometry args={[0.42, 0.42, 0.68]} />
                <Ceramic />
            </mesh>
            {/* Toilet seat lid */}
            <mesh position={[lx, 0.55, bz]} castShadow>
                <boxGeometry args={[0.39, 0.06, 0.44]} />
                <meshStandardMaterial color="#f0f4f8" roughness={0.3} />
            </mesh>
            {/* Tank */}
            <mesh position={[lx, 0.67, bz - 0.3]} castShadow>
                <boxGeometry args={[0.38, 0.32, 0.19]} />
                <Ceramic />
            </mesh>
            {/* Flush button */}
            <mesh position={[lx + 0.2, 0.84, bz - 0.3]}>
                <cylinderGeometry args={[0.025, 0.025, 0.02, 12]} />
                <MetalBright />
            </mesh>
            {/* Toilet paper holder */}
            <mesh position={[lx + 0.26, 0.7, bz + 0.2]}>
                <cylinderGeometry args={[0.02, 0.02, 0.12, 8]} rotation={[0, 0, Math.PI / 2]} />
                <Metal />
            </mesh>
            <mesh position={[lx + 0.26, 0.7, bz + 0.2]}>
                <cylinderGeometry args={[0.055, 0.055, 0.1, 12]} rotation={[0, 0, Math.PI / 2]} />
                <White />
            </mesh>

            {/* ── Vanity unit / sink cabinet ── */}
            <mesh position={[0, 0.38, bz]} castShadow receiveShadow>
                <boxGeometry args={[0.8, 0.76, 0.52]} />
                <CabinetWarm />
            </mesh>
            {/* Sink basin */}
            <mesh position={[0, 0.79, bz]} castShadow>
                <boxGeometry args={[0.58, 0.12, 0.42]} />
                <Ceramic />
            </mesh>
            {/* Basin bowl (inset dark) */}
            <mesh position={[0, 0.84, bz]}>
                <boxGeometry args={[0.44, 0.06, 0.3]} />
                <meshStandardMaterial color="#a8c8e0" roughness={0.1} />
            </mesh>
            {/* Faucet */}
            <mesh position={[0, 0.96, bz - 0.17]}>
                <cylinderGeometry args={[0.018, 0.018, 0.22, 8]} />
                <MetalBright />
            </mesh>
            <mesh position={[0, 1.07, bz - 0.08]}>
                <boxGeometry args={[0.022, 0.022, 0.22]} />
                <MetalBright />
            </mesh>
            {/* Mirror above vanity */}
            <mesh position={[0, 1.5, bz - 0.25]}>
                <boxGeometry args={[0.76, 0.72, 0.04]} />
                <meshStandardMaterial color="#9ab8c8" metalness={0.85} roughness={0.04} />
            </mesh>
            {/* Mirror frame */}
            <mesh position={[0, 1.5, bz - 0.27]}>
                <boxGeometry args={[0.82, 0.78, 0.02]} />
                <Frame />
            </mesh>
            {/* Soap dispenser */}
            <mesh position={[0.24, 0.84, bz]}>
                <cylinderGeometry args={[0.04, 0.035, 0.18, 10]} />
                <meshStandardMaterial color="#94a3b8" roughness={0.4} />
            </mesh>
            {/* Toothbrush holder */}
            <mesh position={[-0.22, 0.84, bz]}>
                <cylinderGeometry args={[0.04, 0.04, 0.12, 10]} />
                <meshStandardMaterial color="#f0f4f8" roughness={0.4} />
            </mesh>

            {/* ── Towel rack ── */}
            <mesh position={[rx + 0.01, 1.15, fz - 0.15]}>
                <cylinderGeometry args={[0.015, 0.015, 0.55, 8]} rotation={[0, 0, Math.PI / 2]} />
                <MetalBright />
            </mesh>
            {/* Towels */}
            <mesh position={[rx - 0.02, 1.12, fz - 0.15]}>
                <boxGeometry args={[0.48, 0.06, 0.28]} />
                <meshStandardMaterial color="#60a5fa" roughness={0.9} />
            </mesh>

            {/* ── Bath mat ── */}
            <AreaRug position={[0, 0, bz + 0.7]} w={0.65} d={0.45} color="#94a3b8" />
            <AreaRug position={[lx + 0.15, 0, bz + 0.55]} w={0.4} d={0.4} color="#94a3b8" />

            {/* ── Storage cabinet ── */}
            <mesh position={[rx, 1.1, fz - 0.01]} castShadow>
                <boxGeometry args={[0.6, 1.0, 0.26]} />
                <CabinetWarm />
            </mesh>
            {/* Cabinet door */}
            <mesh position={[rx, 1.1, fz + 0.12]}>
                <boxGeometry args={[0.56, 0.96, 0.02]} />
                <meshStandardMaterial color="#8a7560" roughness={0.4} />
            </mesh>

            {/* ── Small plant ── */}
            <PlantDecor position={[lx + 0.12, 0, fz - 0.12]} scale={0.75} />
        </group>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// LAUNDRY ROOM
// ─────────────────────────────────────────────────────────────────────────────
const LaundryFurnishings = ({ w, d }) => {
    const sw = Math.max(w - 0.6, 1.0);
    const bz = -(d / 2 - 0.22);
    const rx = w / 2 - 0.38;
    const lx = -(w / 2 - 0.38);

    return (
        <group>
            {/* ── Back-wall shelving unit ── */}
            <mesh position={[0, 1.0, bz]} castShadow receiveShadow>
                <boxGeometry args={[sw, 2.0, 0.38]} />
                <Cabinet />
            </mesh>
            {/* Side panels */}
            <mesh position={[-sw / 2 + 0.02, 1.0, bz]}>
                <boxGeometry args={[0.03, 2.0, 0.38]} />
                <meshStandardMaterial color="#7a8a9a" roughness={0.6} />
            </mesh>
            <mesh position={[sw / 2 - 0.02, 1.0, bz]}>
                <boxGeometry args={[0.03, 2.0, 0.38]} />
                <meshStandardMaterial color="#7a8a9a" roughness={0.6} />
            </mesh>
            {/* Shelf boards */}
            {[0.28, 0.78, 1.28, 1.78].map((sy, i) => (
                <mesh key={i} position={[0, sy, bz + 0.005]}>
                    <boxGeometry args={[sw - 0.05, 0.028, 0.36]} />
                    <meshStandardMaterial color="#9ab0c0" roughness={0.45} />
                </mesh>
            ))}
            {/* Shelf items — detergent bottles */}
            {[
                [-sw / 2 + 0.14, 0.46, bz + 0.04, '#3b82f6', 0.09, 0.25],
                [-sw / 2 + 0.3,  0.48, bz + 0.04, '#22c55e', 0.08, 0.28],
                [0.1,            0.46, bz + 0.04, '#f59e0b', 0.09, 0.22],
                [sw / 2 - 0.18, 0.46, bz + 0.04, '#ef4444', 0.07, 0.24],
            ].map(([bx, by, bz2, col, r, bh], i) => (
                <mesh key={i} position={[bx, by, bz2]} castShadow>
                    <cylinderGeometry args={[r, r, bh, 10]} />
                    <meshStandardMaterial color={col} roughness={0.5} />
                </mesh>
            ))}
            {/* Folded towels on second shelf */}
            {[-0.25, 0.1, 0.45].map((ox, i) => (
                <mesh key={i} position={[ox, 1.0, bz + 0.06]} castShadow>
                    <boxGeometry args={[0.24, 0.14, 0.28]} />
                    <meshStandardMaterial color={['#dbeafe', '#fef3c7', '#dcfce7'][i]} roughness={0.9} />
                </mesh>
            ))}
            {/* Spray bottles top shelf */}
            {[-0.3, 0.3].map((ox, i) => (
                <mesh key={i} position={[ox, 1.52, bz + 0.04]} castShadow>
                    <cylinderGeometry args={[0.04, 0.035, 0.28, 8]} />
                    <meshStandardMaterial color={['#a78bfa', '#fb923c'][i]} roughness={0.4} />
                </mesh>
            ))}

            {/* ── Utility sink (left wall) ── */}
            <mesh position={[lx, 0.44, -0.1]} castShadow receiveShadow>
                <boxGeometry args={[0.62, 0.88, 0.72]} />
                <meshStandardMaterial color="#94a3b8" roughness={0.5} />
            </mesh>
            {/* Sink basin */}
            <mesh position={[lx, 0.9, -0.1]}>
                <boxGeometry args={[0.52, 0.08, 0.58]} />
                <meshStandardMaterial color="#bdd4e4" roughness={0.2} />
            </mesh>
            {/* Faucet */}
            <mesh position={[lx + 0.28, 1.05, -0.28]}>
                <cylinderGeometry args={[0.016, 0.016, 0.24, 8]} />
                <MetalBright />
            </mesh>

            {/* ── Ironing board ── */}
            <group position={[rx - 0.12, 0, 0.2]} rotation={[0, -0.3, 0]}>
                <mesh position={[0, 0.9, 0]} castShadow>
                    <boxGeometry args={[1.1, 0.04, 0.36]} />
                    <meshStandardMaterial color="#c8d8e8" roughness={0.7} />
                </mesh>
                {/* Board shape tapered (approximated) */}
                <mesh position={[0.5, 0.89, 0]}>
                    <boxGeometry args={[0.12, 0.04, 0.24]} />
                    <meshStandardMaterial color="#c8d8e8" roughness={0.7} />
                </mesh>
                {/* Legs */}
                {[[-0.35, 0.5], [0.35, -0.5]].map(([ox, oz], i) => (
                    <mesh key={i} position={[ox, 0.45, oz * 0.3]}>
                        <boxGeometry args={[0.02, 0.9, 0.02]} rotation={[0.2, 0, 0]} />
                        <Metal />
                    </mesh>
                ))}
                {/* Iron on top */}
                <mesh position={[-0.35, 0.95, 0]} castShadow>
                    <boxGeometry args={[0.24, 0.1, 0.14]} />
                    <meshStandardMaterial color="#374151" roughness={0.4} />
                </mesh>
            </group>

            {/* ── Laundry baskets ── */}
            <mesh position={[rx - 0.01, 0.28, d / 2 - 0.36]} castShadow receiveShadow>
                <cylinderGeometry args={[0.22, 0.18, 0.56, 16]} />
                <meshStandardMaterial color="#374151" roughness={0.85} />
            </mesh>
            <mesh position={[rx - 0.01, 0.57, d / 2 - 0.36]}>
                <torusGeometry args={[0.22, 0.016, 8, 24]} />
                <Metal />
            </mesh>
            {/* Second smaller basket */}
            <mesh position={[rx - 0.6, 0.22, d / 2 - 0.36]} castShadow receiveShadow>
                <cylinderGeometry args={[0.17, 0.14, 0.44, 16]} />
                <meshStandardMaterial color="#6b7280" roughness={0.85} />
            </mesh>

            {/* ── Drying rack (folded) ── */}
            <group position={[lx + 0.18, 0, d / 2 - 0.35]}>
                <mesh position={[0, 0.65, 0]}>
                    <boxGeometry args={[0.55, 0.03, 0.04]} />
                    <Metal />
                </mesh>
                <mesh position={[0, 0.5, 0]}>
                    <boxGeometry args={[0.55, 0.03, 0.04]} />
                    <Metal />
                </mesh>
                <mesh position={[0, 0.35, 0]}>
                    <boxGeometry args={[0.55, 0.03, 0.04]} />
                    <Metal />
                </mesh>
                {[[-0.25, 0.5], [0.25, 0.5]].map(([ox, oy], i) => (
                    <mesh key={i} position={[ox, oy, 0]}>
                        <boxGeometry args={[0.03, 1.0, 0.04]} />
                        <Metal />
                    </mesh>
                ))}
            </group>
        </group>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// OFFICE
// ─────────────────────────────────────────────────────────────────────────────
const OfficeFurnishings = ({ w, d }) => {
    const bz = -(d / 2 - 0.34);
    const rx = w / 2 - 0.38;
    const lx = -(w / 2 - 0.38);

    return (
        <group>
            {/* ── Desk (L-shape, corner) ── */}
            {/* Main desk */}
            <mesh position={[0, 0.76, bz]} castShadow receiveShadow>
                <boxGeometry args={[Math.min(w - 0.7, 1.7), 0.04, 0.68]} />
                <WoodLight />
            </mesh>
            {/* Return desk (right side) */}
            <mesh position={[rx + 0.01, 0.76, bz + 0.55]} castShadow receiveShadow>
                <boxGeometry args={[0.6, 0.04, 0.78]} />
                <WoodLight />
            </mesh>
            {/* Desk legs */}
            {[[-0.7, bz + 0.26], [0.7, bz + 0.26], [-0.7, bz - 0.26], [rx - 0.06, bz + 0.9]].map(([lx2, lz2], i) => (
                <mesh key={i} position={[lx2, 0.38, lz2]} castShadow>
                    <boxGeometry args={[0.06, 0.76, 0.06]} />
                    <Metal />
                </mesh>
            ))}
            {/* Desk modesty panel / back panel */}
            <mesh position={[0, 0.38, bz - 0.32]}>
                <boxGeometry args={[Math.min(w - 0.7, 1.7), 0.72, 0.02]} />
                <WoodDark />
            </mesh>

            {/* ── Monitors ── */}
            {/* Main monitor */}
            <mesh position={[-0.2, 1.18, bz - 0.2]} castShadow>
                <boxGeometry args={[0.58, 0.36, 0.04]} />
                <meshStandardMaterial color="#111827" roughness={0.2} metalness={0.3} />
            </mesh>
            {/* Screen */}
            <mesh position={[-0.2, 1.18, bz - 0.18]}>
                <boxGeometry args={[0.55, 0.33, 0.01]} />
                <meshStandardMaterial color="#0f172a" roughness={0.05} />
            </mesh>
            {/* Monitor stand */}
            <mesh position={[-0.2, 0.88, bz - 0.19]}>
                <cylinderGeometry args={[0.02, 0.02, 0.24, 6]} />
                <Metal />
            </mesh>
            <mesh position={[-0.2, 0.78, bz - 0.17]}>
                <boxGeometry args={[0.2, 0.02, 0.18]} />
                <Metal />
            </mesh>
            {/* Second monitor (right, angled) */}
            <group rotation={[0, -0.35, 0]} position={[0.38, 0, bz - 0.18]}>
                <mesh position={[0, 1.18, 0]} castShadow>
                    <boxGeometry args={[0.5, 0.32, 0.04]} />
                    <meshStandardMaterial color="#111827" roughness={0.2} metalness={0.3} />
                </mesh>
                <mesh position={[0, 0.88, 0.01]}>
                    <cylinderGeometry args={[0.02, 0.02, 0.22, 6]} />
                    <Metal />
                </mesh>
                <mesh position={[0, 0.78, 0.03]}>
                    <boxGeometry args={[0.16, 0.02, 0.15]} />
                    <Metal />
                </mesh>
            </group>

            {/* Keyboard */}
            <mesh position={[-0.1, 0.79, bz + 0.1]} castShadow>
                <boxGeometry args={[0.42, 0.025, 0.16]} />
                <meshStandardMaterial color="#1f2937" roughness={0.5} />
            </mesh>
            {/* Mouse */}
            <mesh position={[0.24, 0.79, bz + 0.1]} castShadow>
                <boxGeometry args={[0.07, 0.03, 0.12]} />
                <meshStandardMaterial color="#374151" roughness={0.5} />
            </mesh>
            {/* Mouse pad */}
            <mesh position={[0.2, 0.777, bz + 0.1]}>
                <boxGeometry args={[0.22, 0.005, 0.26]} />
                <meshStandardMaterial color="#1e293b" roughness={0.9} />
            </mesh>
            {/* Desk lamp */}
            <mesh position={[0.62, 0.77, bz - 0.18]}>
                <cylinderGeometry args={[0.04, 0.04, 0.04, 8]} />
                <Metal />
            </mesh>
            <mesh position={[0.62, 1.05, bz - 0.18]}>
                <cylinderGeometry args={[0.014, 0.014, 0.56, 6]} />
                <Metal />
            </mesh>
            <mesh position={[0.62, 1.35, bz - 0.08]}>
                <cylinderGeometry args={[0.1, 0.07, 0.16, 10]} />
                <Lamp />
            </mesh>
            {/* Mug */}
            <mesh position={[-0.55, 0.83, bz + 0.06]}>
                <cylinderGeometry args={[0.045, 0.04, 0.1, 10]} />
                <meshStandardMaterial color="#1d4ed8" roughness={0.5} />
            </mesh>

            {/* ── Ergonomic office chair ── */}
            <group position={[0, 0, bz + 0.85]}>
                <mesh position={[0, 0.5, 0]} castShadow receiveShadow>
                    <boxGeometry args={[0.52, 0.06, 0.52]} />
                    <Fabric />
                </mesh>
                <mesh position={[0, 0.82, -0.2]} castShadow>
                    <boxGeometry args={[0.52, 0.55, 0.08]} />
                    <Fabric />
                </mesh>
                {/* Armrests */}
                <mesh position={[-0.23, 0.64, -0.02]}>
                    <boxGeometry args={[0.06, 0.04, 0.44]} />
                    <meshStandardMaterial color="#111827" roughness={0.5} />
                </mesh>
                <mesh position={[0.23, 0.64, -0.02]}>
                    <boxGeometry args={[0.06, 0.04, 0.44]} />
                    <meshStandardMaterial color="#111827" roughness={0.5} />
                </mesh>
                <mesh position={[0, 0.25, 0]}>
                    <cylinderGeometry args={[0.03, 0.03, 0.5, 8]} />
                    <Metal />
                </mesh>
                {/* Star base */}
                {[0, 1, 2, 3, 4].map((i) => {
                    const angle = (i / 5) * Math.PI * 2;
                    return (
                        <mesh key={i} position={[Math.cos(angle) * 0.22, 0.04, Math.sin(angle) * 0.22]}>
                            <boxGeometry args={[0.04, 0.035, 0.4]} rotation={[0, angle, 0]} />
                            <Metal />
                        </mesh>
                    );
                })}
            </group>

            {/* ── Floor-to-ceiling bookshelf (left wall) ── */}
            <mesh position={[lx + 0.01, 1.2, 0.1]} castShadow receiveShadow>
                <boxGeometry args={[0.62, 2.4, 0.32]} />
                <WoodDark />
            </mesh>
            {/* 5 shelves */}
            {[0.15, 0.6, 1.05, 1.5, 1.95].map((sy, i) => (
                <mesh key={i} position={[lx + 0.01, sy, 0.1]}>
                    <boxGeometry args={[0.6, 0.022, 0.3]} />
                    <WoodLight />
                </mesh>
            ))}
            {/* Books on shelves */}
            {[
                [lx + 0.14, 0.36, 0.08, 0.28, 0.34, '#dc2626'],
                [lx + 0.27, 0.36, 0.08, 0.24, 0.3, '#2563eb'],
                [lx - 0.01, 0.36, 0.08, 0.2, 0.32, '#16a34a'],
                [lx - 0.14, 0.36, 0.08, 0.18, 0.28, '#d97706'],
                [lx + 0.1, 0.82, 0.08, 0.26, 0.35, '#7c3aed'],
                [lx - 0.04, 0.82, 0.08, 0.2, 0.3, '#0891b2'],
                [lx + 0.22, 0.82, 0.08, 0.18, 0.28, '#be185d'],
                [lx + 0.08, 1.28, 0.08, 0.22, 0.34, '#059669'],
                [lx - 0.06, 1.28, 0.08, 0.18, 0.3, '#9333ea'],
                [lx + 0.2, 1.28, 0.08, 0.2, 0.28, '#ea580c'],
            ].map(([bx, by, bz2, bw, bh, col], i) => (
                <mesh key={i} position={[bx, by, bz2]} castShadow>
                    <boxGeometry args={[bw, bh, 0.2]} />
                    <meshStandardMaterial color={col} roughness={0.8} />
                </mesh>
            ))}
            {/* Small plant on top shelf */}
            <PlantDecor position={[lx + 0.04, 2.42, 0.1]} scale={0.55} />

            {/* ── Filing cabinet (right corner) ── */}
            <mesh position={[rx + 0.01, 0.65, d / 2 - 0.34]} castShadow receiveShadow>
                <boxGeometry args={[0.58, 1.3, 0.6]} />
                <meshStandardMaterial color="#475569" roughness={0.5} />
            </mesh>
            {/* Drawer pulls */}
            {[0.24, 0.58, 0.92, 1.26].map((sy, i) => (
                <mesh key={i} position={[rx + 0.3, sy, d / 2 - 0.34]}>
                    <cylinderGeometry args={[0.013, 0.013, 0.12, 8]} rotation={[0, 0, Math.PI / 2]} />
                    <MetalBright />
                </mesh>
            ))}

            {/* ── Notice board on wall ── */}
            <mesh position={[0, 1.6, bz - 0.35]}>
                <boxGeometry args={[0.9, 0.6, 0.03]} />
                <meshStandardMaterial color="#92400e" roughness={0.9} />
            </mesh>
            {/* Papers on board */}
            {[[-0.28, 1.7, 0.02], [0.1, 1.55, 0.02], [-0.08, 1.65, 0.02]].map(([bx, by, bz2], i) => (
                <mesh key={i} position={[bx, by, bz - 0.33]}>
                    <boxGeometry args={[0.22, 0.15, 0.005]} />
                    <meshStandardMaterial color={['#fef9c3', '#dbeafe', '#dcfce7'][i]} roughness={0.9} />
                </mesh>
            ))}

            {/* ── Floor plant ── */}
            <FloorPlant position={[lx + 0.26, 0, d / 2 - 0.28]} />

            {/* ── Rug under desk ── */}
            <AreaRug position={[0, 0, bz + 0.45]} w={1.6} d={1.2} color="#1e3a5f" />
        </group>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// HALLWAY / GENEL
// ─────────────────────────────────────────────────────────────────────────────
const HallwayFurnishings = ({ w, d }) => {
    const bz = -(d / 2 - 0.18);
    const fz = d / 2 - 0.18;
    const rx = w / 2 - 0.3;
    const lx = -(w / 2 - 0.3);

    return (
        <group>
            {/* ── Entry table ── */}
            <mesh position={[0, 0.75, bz]} castShadow receiveShadow>
                <boxGeometry args={[Math.min(w - 0.8, 1.2), 0.04, 0.34]} />
                <WoodDark />
            </mesh>
            {[[-0.48, 0.13], [0.48, 0.13], [-0.48, -0.13], [0.48, -0.13]].map(([lx2, lz2], i) => (
                <mesh key={i} position={[lx2, 0.375, bz + lz2]}>
                    <boxGeometry args={[0.04, 0.75, 0.04]} />
                    <WoodDark />
                </mesh>
            ))}
            {/* Key bowl on table */}
            <mesh position={[0, 0.79, bz]}>
                <cylinderGeometry args={[0.1, 0.08, 0.06, 12]} />
                <meshStandardMaterial color="#b08060" roughness={0.6} />
            </mesh>
            {/* Small plant on table */}
            <PlantDecor position={[0.38, 0.75, bz]} scale={0.6} />

            {/* ── Large mirror ── */}
            <mesh position={[0, 1.4, bz - 0.16]}>
                <boxGeometry args={[Math.min(w - 0.8, 1.0), 1.2, 0.05]} />
                <meshStandardMaterial color="#9ab8c8" metalness={0.9} roughness={0.03} />
            </mesh>
            <mesh position={[0, 1.4, bz - 0.19]}>
                <boxGeometry args={[Math.min(w - 0.78, 1.06), 1.26, 0.03]} />
                <Frame />
            </mesh>

            {/* ── Coat rack ── */}
            <group position={[rx, 0, bz + 0.05]}>
                <mesh position={[0, 0.9, 0]}>
                    <cylinderGeometry args={[0.025, 0.025, 1.8, 8]} />
                    <WoodDark />
                </mesh>
                <mesh position={[0, 0.1, 0]}>
                    <cylinderGeometry args={[0.16, 0.16, 0.06, 10]} />
                    <WoodDark />
                </mesh>
                {/* Hooks */}
                {[1.5, 1.3, 1.1].map((hy, i) => (
                    <group key={i} position={[0, hy, 0]} rotation={[0, (i * Math.PI * 2) / 3, 0]}>
                        <mesh position={[0.08, 0, 0]}>
                            <boxGeometry args={[0.16, 0.025, 0.025]} />
                            <Metal />
                        </mesh>
                        <mesh position={[0.16, -0.04, 0]}>
                            <boxGeometry args={[0.025, 0.08, 0.025]} />
                            <Metal />
                        </mesh>
                    </group>
                ))}
                {/* Coat on hook */}
                <mesh position={[0.12, 1.35, 0.04]}>
                    <boxGeometry args={[0.1, 0.35, 0.06]} />
                    <meshStandardMaterial color="#374151" roughness={0.9} />
                </mesh>
            </group>

            {/* ── Shoe rack (left wall) ── */}
            <mesh position={[lx, 0.25, bz + 0.05]} castShadow receiveShadow>
                <boxGeometry args={[0.52, 0.5, 0.36]} />
                <WoodLight />
            </mesh>
            {/* Shoes (simplified) */}
            {[[0, 0.1], [0.12, -0.08]].map(([ox, oz], i) => (
                <mesh key={i} position={[lx + ox, 0.53, bz + oz]}>
                    <boxGeometry args={[0.1, 0.08, 0.28]} />
                    <meshStandardMaterial color={['#1e293b', '#92400e'][i]} roughness={0.7} />
                </mesh>
            ))}

            {/* ── Hall runner rug ── */}
            <AreaRug position={[0, 0, 0]} w={Math.min(w * 0.55, 1.2)} d={d * 0.7} color="#7c5c3e" />

            {/* ── Small bench ── */}
            <mesh position={[0, 0.24, fz]} castShadow receiveShadow>
                <boxGeometry args={[Math.min(w - 0.8, 1.2), 0.06, 0.38]} />
                <FabricBeige />
            </mesh>
            {[[-0.46, 0.14], [0.46, 0.14], [-0.46, -0.14], [0.46, -0.14]].map(([lx2, lz2], i) => (
                <mesh key={i} position={[lx2, 0.105, fz + lz2]}>
                    <boxGeometry args={[0.06, 0.48, 0.06]} />
                    <WoodDark />
                </mesh>
            ))}

            {/* ── Umbrella stand (right, front) ── */}
            <mesh position={[rx, 0.3, fz - 0.04]} castShadow>
                <cylinderGeometry args={[0.08, 0.1, 0.6, 10]} />
                <meshStandardMaterial color="#475569" metalness={0.4} roughness={0.4} />
            </mesh>
            {/* Umbrella in stand */}
            <mesh position={[rx, 0.8, fz - 0.04]}>
                <cylinderGeometry args={[0.015, 0.015, 1.0, 6]} />
                <meshStandardMaterial color="#1d4ed8" roughness={0.5} />
            </mesh>
        </group>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// DISPATCHER
// ─────────────────────────────────────────────────────────────────────────────
const RoomFurnishings = ({ roomType, width = 6, depth = 5, height = 3 }) => {
    const w = width, d = depth, h = height;
    switch (roomType) {
        case 'Mutfak':        return <KitchenFurnishings      w={w} d={d} h={h} />;
        case 'Oturma Odası':  return <LivingRoomFurnishings   w={w} d={d} h={h} />;
        case 'Yatak Odası':   return <BedroomFurnishings      w={w} d={d} h={h} />;
        case 'Banyo':         return <BathroomFurnishings     w={w} d={d} h={h} />;
        case 'Çamaşır Odası': return <LaundryFurnishings      w={w} d={d} h={h} />;
        case 'Ofis':          return <OfficeFurnishings       w={w} d={d} h={h} />;
        case 'Genel':         return <HallwayFurnishings      w={w} d={d} h={h} />;
        default:              return <HallwayFurnishings      w={w} d={d} h={h} />;
    }
};

export default RoomFurnishings;

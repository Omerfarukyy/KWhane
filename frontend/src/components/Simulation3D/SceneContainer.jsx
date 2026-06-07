import { Suspense, useMemo, useEffect } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Grid, Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import Lights, { SUN_POSITION } from './Lights';
import { useTheme } from '../../contexts/ThemeProvider';
import RoomBuilder from './RoomBuilder';
import CameraControls from './CameraControls';
import KeyboardCameraControls from './KeyboardCameraControls';
import DraggableObject from './DraggableObject';
import ProceduralDevices from './ProceduralDevices';
import GhostDevice from './GhostDevice';
import EnergyBadge from './EnergyBadge';
import GardenProps from './GardenProps';
import ElectricHub from './ElectricHub';
import ElectricWiring from './ElectricWiring';
import useCollision from './useCollision';
import useSceneStore from '../../store/useSceneStore';
import './SceneContainer.css';

// ─── Adjacency detection ─────────────────────────────────────────────────────
const DOOR_THRESHOLD = 0.35; // rooms within this world-unit distance share a wall

function computeAdjacencies(rooms) {
    const adj = new Map(rooms.map((r) => [r.id, { right: null, left: null, front: null, back: null }]));

    for (let i = 0; i < rooms.length; i++) {
        for (let j = i + 1; j < rooms.length; j++) {
            const a = rooms[i];
            const b = rooms[j];
            const ax = a.position[0], az = a.position[2];
            const bx = b.position[0], bz = b.position[2];

            const aRight = ax + a.size.width / 2;
            const aLeft  = ax - a.size.width / 2;
            const bRight = bx + b.size.width / 2;
            const bLeft  = bx - b.size.width / 2;
            const aFront = az + a.size.depth / 2;
            const aBack  = az - a.size.depth / 2;
            const bFront = bz + b.size.depth / 2;
            const bBack  = bz - b.size.depth / 2;

            const xOverlap = Math.min(aRight, bRight) - Math.max(aLeft, bLeft);
            const zOverlap = Math.min(aFront, bFront) - Math.max(aBack, bBack);

            if (Math.abs(aRight - bLeft) < DOOR_THRESHOLD && zOverlap > 0.5) {
                adj.get(a.id).right = b.id;
                adj.get(b.id).left  = a.id;
            } else if (Math.abs(aLeft - bRight) < DOOR_THRESHOLD && zOverlap > 0.5) {
                adj.get(a.id).left  = b.id;
                adj.get(b.id).right = a.id;
            } else if (Math.abs(aFront - bBack) < DOOR_THRESHOLD && xOverlap > 0.5) {
                adj.get(a.id).front = b.id;
                adj.get(b.id).back  = a.id;
            } else if (Math.abs(aBack - bFront) < DOOR_THRESHOLD && xOverlap > 0.5) {
                adj.get(a.id).back  = b.id;
                adj.get(b.id).front = a.id;
            }
        }
    }
    return adj;
}

/**
 * SceneContainer.jsx — İzole 3D Sahne Bileşeni
 *
 * Props:
 *   onGhostClick(ghost)    — called when user clicks a ghost device suggestion
 *   onGhostDismiss(id)     — called when user dismisses a ghost via ×
 *   children               — optional extra Three.js elements
 */
const SceneContainer = ({ children, onGhostClick, onGhostDismiss }) => {
    const cameraDistance = 15;

    return (
        <div className="scene-container relative">
            <Suspense
                fallback={<div className="scene-container__loader">Sahne yükleniyor…</div>}
            >
                <Canvas
                    shadows="soft"
                    frameloop="always"
                    gl={{
                        toneMapping: THREE.NoToneMapping,
                        outputColorSpace: THREE.SRGBColorSpace,
                    }}
                    camera={{
                        position: [cameraDistance, cameraDistance * 0.8, cameraDistance],
                        fov: 50,
                        near: 0.1,
                        far: 1000,
                    }}
                >
                    <SceneContent
                        onGhostClick={onGhostClick}
                        onGhostDismiss={onGhostDismiss}
                    >
                        {children}
                    </SceneContent>
                </Canvas>
            </Suspense>
        </div>
    );
};

/**
 * SceneContent — Canvas içindeki dinamik sahne içeriği
 */
const SceneContent = ({ children, onGhostClick, onGhostDismiss }) => {
    const collision = useCollision();
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    const rooms        = useSceneStore((state) => state.rooms);
    const objects      = useSceneStore((state) => state.objects);
    const ghostObjects = useSceneStore((state) => state.ghostObjects);
    const energyData   = useSceneStore((state) => state.energyData);
    const setSelectedId     = useSceneStore((state) => state.setSelectedId);
    const setPinnedDeviceId = useSceneStore((state) => state.setPinnedDeviceId);

    const adjacencies = useMemo(() => computeAdjacencies(rooms), [rooms]);

    // Per-room heat levels (0=cool, 1=hot) derived from energyData
    const roomHeatLevels = useMemo(() => {
        const roomKwh = {};
        rooms.forEach(r => { roomKwh[r.id] = 0; });
        objects.forEach(obj => {
            const kwh = energyData[obj.id]?.monthly_kwh ?? 0;
            if (obj.roomId && roomKwh[obj.roomId] !== undefined) {
                roomKwh[obj.roomId] += kwh;
            }
        });
        const values = Object.values(roomKwh);
        const maxKwh = Math.max(...values);
        const minKwh = Math.min(...values);
        if (maxKwh < 1) return {}; // no meaningful data yet
        const range = maxKwh - minKwh;
        const levels = {};
        Object.entries(roomKwh).forEach(([id, kwh]) => {
            levels[id] = range < 0.5 ? 0.5 : (kwh - minKwh) / range;
        });
        return levels;
    }, [rooms, objects, energyData]);

    const handlePointerMissed = () => { setSelectedId(null); setPinnedDeviceId(null); };

    return (
        <group onPointerMissed={handlePointerMissed}>
            {/* ─── Kamera Kontrolleri ──────────────────── */}
            <CameraControls maxDistance={60} minDistance={2} />
            <KeyboardCameraControls />

            {/* ─── Aydınlatma ─────────────────────────── */}
            <Lights />

            {/* ─── Gökyüzü (theme-synced: gündüz/gece) ─── */}
            <SceneBackground isDark={isDark} />
            {isDark ? (
                <>
                    <Stars radius={100} depth={50} count={4000} factor={4} saturation={0} fade speed={0.5} />
                    {/* Moon disk near directional-light position */}
                    <mesh position={SUN_POSITION}>
                        <sphereGeometry args={[2.4, 24, 24]} />
                        <meshBasicMaterial color="#e8edff" />
                    </mesh>
                </>
            ) : (
                <>
                    <Sky
                        distance={450000}
                        sunPosition={SUN_POSITION}
                        turbidity={6}
                        rayleigh={1.2}
                        mieCoefficient={0.005}
                        mieDirectionalG={0.8}
                    />
                    {/* Decorative static cloud puffs — simple white spheres far above */}
                    <DecorativeClouds />
                </>
            )}

            {/* ─── Bahçe Zemini (geniş çim alan) ──────── */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.005, 0]}
                receiveShadow
            >
                <planeGeometry args={[200, 200]} />
                <meshStandardMaterial color={isDark ? '#2a3a26' : '#5d8a4e'} roughness={0.95} metalness={0} />
            </mesh>

            {/* ─── Bahçe Prop'ları (ağaçlar + çalılar) ── */}
            <GardenProps />

            {/* ─── Zemin Izgarası ─────────────────────── */}
            <Grid
                args={[100, 100]}
                cellSize={0.5}
                cellThickness={0.5}
                cellColor="#3f5a3a"
                sectionSize={1}
                sectionThickness={1}
                sectionColor="#506b48"
                fadeDistance={50}
                fadeStrength={1}
                followCamera={false}
                infiniteGrid={false}
                position={[0, -0.001, 0]}
            />

            {/* ─── Elektrik Tesisatı ───────────────────── */}
            <ElectricHub />
            <ElectricWiring />

            {/* ─── Dinamik Odalar ──────────────────────── */}
            {rooms.map((r) => (
                <RoomBuilder
                    key={r.id}
                    id={r.id}
                    name={r.name}
                    roomType={r.roomType}
                    position={r.position}
                    width={r.size.width}
                    depth={r.size.depth}
                    height={r.size.height}
                    adjacentSides={adjacencies.get(r.id) || {}}
                    heatLevel={roomHeatLevels[r.id] ?? 0}
                />
            ))}


            {/* ─── Ghost (Hologram) Cihazlar ───────────── */}
            {ghostObjects.filter((g) =>
                !objects.some((o) => o.roomId === g.roomId && o.type === g.type)
            ).map((ghost) => (
                <GhostDevice
                    key={ghost.id}
                    ghost={ghost}
                    onGhostClick={onGhostClick || (() => {})}
                    onGhostDismiss={onGhostDismiss || (() => {})}
                />
            ))}

            {/* ─── Yerleştirilmiş Cihazlar ─────────────── */}
            {objects.map((obj) => {
                const room = rooms.find((r) => r.id === obj.roomId);

                return (
                    <DraggableObject
                        key={obj.id}
                        objectId={obj.id}
                        objectType={obj.type}
                        position={obj.position}
                        rotation={obj.rotation}
                        gridSnap={0.5}
                        collision={collision}
                        objectSize={obj.size}
                        room={room}
                        floorY={obj.position[1]}
                    >
                        {/* Procedural device mesh for all known types */}
                        {obj.type !== 'box' ? (
                            <ProceduralDevices type={obj.type} size={obj.size} />
                        ) : (
                            <mesh castShadow position={[0, obj.size[1] / 2, 0]}>
                                <boxGeometry args={obj.size} />
                                <meshStandardMaterial color={obj.color} />
                            </mesh>
                        )}
                    </DraggableObject>
                );
            })}

            {/* ─── Enerji Rozeti Overlayları ───────────── */}
            {objects.filter(obj => obj.type !== 'electric_hub').map((obj) => (
                <EnergyBadge
                    key={`badge-${obj.id}`}
                    object={obj}
                    energyData={energyData[obj.id]}
                    heightOffset={0.3}
                />
            ))}

            {/* Dışarıdan eklenen ek 3D bileşenler */}
            {children}
        </group>
    );
};

// ─── SceneBackground ────────────────────────────────────────────────────────
// Imperative scene.background swap so the night color cleans up properly when
// the user switches back to light mode (avoids a stuck black or white flash).
const NIGHT_BG = new THREE.Color('#070b18');
function SceneBackground({ isDark }) {
    const { scene } = useThree();
    useEffect(() => {
        const prev = scene.background;
        scene.background = isDark ? NIGHT_BG : null; // null lets <Sky> show through
        return () => { scene.background = prev; };
    }, [isDark, scene]);
    return null;
}

// ─── DecorativeClouds ───────────────────────────────────────────────────────
// A handful of low-opacity white spheres scattered in the sky as stylized
// clouds. Static, no animation, no volumetric maths — replaces drei's
// <Cloud>/<Clouds> which was filling the canvas white in this scene.
function DecorativeClouds() {
    const puffs = [
        { p: [-22, 18, -14], r: 2.6 }, { p: [-18, 18, -14], r: 2.0 }, { p: [-20, 19, -16], r: 1.8 },
        { p: [16, 22, -20],  r: 2.4 }, { p: [19, 22, -18], r: 1.9 },
        { p: [4,  24, 22],   r: 2.2 }, { p: [7,  24, 22],  r: 1.7 }, { p: [5, 25, 20], r: 1.5 },
        { p: [-8, 20, 24],   r: 2.0 }, { p: [-5, 20, 24],  r: 1.6 },
    ];
    return (
        <group>
            {puffs.map((c, i) => (
                <mesh key={i} position={c.p}>
                    <sphereGeometry args={[c.r, 16, 12]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.85} depthWrite={false} />
                </mesh>
            ))}
        </group>
    );
}

export default SceneContainer;

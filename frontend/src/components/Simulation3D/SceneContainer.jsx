import { Suspense, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid, Sky } from '@react-three/drei';
import * as THREE from 'three';
import Lights, { SUN_POSITION } from './Lights';
import RoomBuilder from './RoomBuilder';
import CameraControls from './CameraControls';
import KeyboardCameraControls from './KeyboardCameraControls';
import DraggableObject from './DraggableObject';
import ProceduralDevices from './ProceduralDevices';
import GhostDevice from './GhostDevice';
import EnergyBadge from './EnergyBadge';
import GardenProps from './GardenProps';
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

    const rooms        = useSceneStore((state) => state.rooms);
    const objects      = useSceneStore((state) => state.objects);
    const ghostObjects = useSceneStore((state) => state.ghostObjects);
    const energyData   = useSceneStore((state) => state.energyData);
    const setSelectedId     = useSceneStore((state) => state.setSelectedId);
    const setPinnedDeviceId = useSceneStore((state) => state.setPinnedDeviceId);

    const adjacencies = useMemo(() => computeAdjacencies(rooms), [rooms]);

    const handlePointerMissed = () => { setSelectedId(null); setPinnedDeviceId(null); };

    return (
        <group onPointerMissed={handlePointerMissed}>
            {/* ─── Kamera Kontrolleri ──────────────────── */}
            <CameraControls maxDistance={60} minDistance={2} />
            <KeyboardCameraControls />

            {/* ─── Aydınlatma ─────────────────────────── */}
            <Lights />

            {/* ─── Gökyüzü (prosedürel) ───────────────── */}
            <Sky
                distance={450000}
                sunPosition={SUN_POSITION}
                turbidity={6}
                rayleigh={1.2}
                mieCoefficient={0.005}
                mieDirectionalG={0.8}
            />

            {/* ─── Bahçe Zemini (geniş çim alan) ──────── */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.005, 0]}
                receiveShadow
            >
                <planeGeometry args={[200, 200]} />
                <meshStandardMaterial color="#5d8a4e" roughness={0.95} metalness={0} />
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
            {objects.map((obj) => (
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

export default SceneContainer;

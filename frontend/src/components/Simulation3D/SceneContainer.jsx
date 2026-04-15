import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import Lights from './Lights';
import RoomBuilder from './RoomBuilder';
import CameraControls from './CameraControls';
import DraggableObject from './DraggableObject';
import ProceduralDevices from './ProceduralDevices';
import GhostDevice from './GhostDevice';
import EnergyBadge from './EnergyBadge';
import useCollision from './useCollision';
import useSceneStore from '../../store/useSceneStore';
import './SceneContainer.css';

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
                    shadows
                    camera={{
                        position: [cameraDistance, cameraDistance * 0.8, cameraDistance],
                        fov: 50,
                        near: 0.1,
                        far: 200,
                    }}
                    onCreated={({ gl }) => {
                        gl.setClearColor('#0f172a');
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

    const rooms       = useSceneStore((state) => state.rooms);
    const objects     = useSceneStore((state) => state.objects);
    const ghostObjects = useSceneStore((state) => state.ghostObjects);
    const energyData  = useSceneStore((state) => state.energyData);
    const setSelectedId = useSceneStore((state) => state.setSelectedId);

    const handlePointerMissed = () => setSelectedId(null);

    return (
        <group onPointerMissed={handlePointerMissed}>
            {/* ─── Kamera Kontrolleri ──────────────────── */}
            <CameraControls maxDistance={60} minDistance={2} />

            {/* ─── Aydınlatma ─────────────────────────── */}
            <Lights />

            {/* ─── Zemin Izgarası ─────────────────────── */}
            <Grid
                args={[100, 100]}
                cellSize={0.5}
                cellThickness={0.5}
                cellColor="#334155"
                sectionSize={1}
                sectionThickness={1}
                sectionColor="#475569"
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
                    position={r.position}
                    width={r.size.width}
                    depth={r.size.depth}
                    height={r.size.height}
                />
            ))}

            {/* ─── Ghost (Hologram) Cihazlar ───────────── */}
            {ghostObjects.map((ghost) => (
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

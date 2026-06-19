import { Suspense, useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { Canvas, useThree, useFrame } from '@react-three/fiber';
import { Grid, Sky, Stars } from '@react-three/drei';
import * as THREE from 'three';
import { Home, Loader2 } from 'lucide-react';
import Lights, { SUN_POSITION } from './Lights';
import { useTheme } from '../../contexts/ThemeProvider';
import { useLanguage } from '../../contexts/LanguageProvider';
import RoomBuilder from './RoomBuilder';
import CameraControls from './CameraControls';
import KeyboardCameraControls from './KeyboardCameraControls';
import DraggableObject from './DraggableObject';
import ProceduralDevices from './ProceduralDevices';
import GhostDevice from './GhostDevice';
import EnergyBadge from './EnergyBadge';
import DeviceInfoPopup from './DeviceInfoPopup';
import GardenProps from './GardenProps';
import ElectricHub from './ElectricHub';
import ElectricWiring from './ElectricWiring';
import useCollision from './useCollision';
import useSceneStore from '../../store/useSceneStore';
import './SceneContainer.css';

// ─── Adjacency detection ─────────────────────────────────────────────────────
const DOOR_THRESHOLD = 0.35;

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

// ─── GPU warmup: render N frames to compile shaders, then signal ready ───────
function SceneWarmup({ onReady }) {
    const count = useRef(0);
    const done = useRef(false);
    const { invalidate } = useThree();

    useFrame(() => {
        if (done.current) return;
        count.current += 1;
        invalidate();
        if (count.current >= 45) {
            done.current = true;
            onReady();
        }
    });

    return null;
}

// ─── Adaptive animation loop for demand mode ────────────────────────────────
// Active interaction → 60 fps, idle > 3 s → 24 fps (saves GPU while
// keeping LED animations visually smooth).
function SceneAnimationLoop() {
    const { invalidate } = useThree();
    const isDragging = useSceneStore((s) => s.isDragging);
    const lastActive = useRef(performance.now());

    useEffect(() => {
        if (isDragging) lastActive.current = performance.now();
    }, [isDragging]);

    useEffect(() => {
        let rafId;
        let prev = 0;

        const tick = (now) => {
            rafId = requestAnimationFrame(tick);
            const idle = now - lastActive.current > 3000;
            const interval = idle ? 41 : 16; // ~24 fps vs ~60 fps
            if (now - prev >= interval) {
                invalidate();
                prev = now;
            }
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, [invalidate]);

    // Keep lastActive fresh on pointer / scroll events inside the canvas
    useFrame(({ gl }) => {
        const dom = gl.domElement;
        if (!dom._kwhaneListeners) {
            const bump = () => { lastActive.current = performance.now(); };
            dom.addEventListener('pointerdown', bump, { passive: true });
            dom.addEventListener('wheel', bump, { passive: true });
            dom._kwhaneListeners = bump;
        }
    });

    return null;
}

// ─── Loading overlay ─────────────────────────────────────────────────────────
const SceneLoadingOverlay = ({ text }) => (
    <div className="scene-loading-overlay">
        <div className="scene-loading-content">
            <div className="scene-loading-icon-wrap">
                <Home size={36} strokeWidth={1.5} />
            </div>
            <p className="scene-loading-text">{text}</p>
            <div className="scene-loading-bar">
                <div className="scene-loading-bar-fill" />
            </div>
        </div>
    </div>
);

/**
 * SceneContainer.jsx — 3D scene wrapper with loading screen & demand-mode rendering.
 */
const SceneContainer = ({ children, onGhostClick, onGhostDismiss }) => {
    const { t } = useLanguage();
    const cameraDistance = 15;
    const [sceneReady, setSceneReady] = useState(false);
    const handleReady = useCallback(() => setSceneReady(true), []);

    return (
        <div className="scene-container relative">
            {/* Loading overlay — fades out after GPU warmup */}
            <div className={`scene-loading-overlay ${sceneReady ? 'scene-loading-overlay--hidden' : ''}`}>
                <div className="scene-loading-content">
                    <div className="scene-loading-icon-wrap">
                        <Home size={36} strokeWidth={1.5} />
                    </div>
                    <p className="scene-loading-text">{t('preparingHome')}</p>
                    <div className="scene-loading-bar">
                        <div className="scene-loading-bar-fill" />
                    </div>
                </div>
            </div>

            <Canvas
                shadows="soft"
                frameloop="demand"
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
                <SceneWarmup onReady={handleReady} />
                <SceneAnimationLoop />
                <SceneContent
                    onGhostClick={onGhostClick}
                    onGhostDismiss={onGhostDismiss}
                >
                    {children}
                </SceneContent>
            </Canvas>
        </div>
    );
};

/**
 * SceneContent — dynamic scene hierarchy inside the Canvas.
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
        if (maxKwh < 1) return {};
        const range = maxKwh - minKwh;
        const levels = {};
        Object.entries(roomKwh).forEach(([id, kwh]) => {
            levels[id] = range < 0.5 ? 0.5 : (kwh - minKwh) / range;
        });
        return levels;
    }, [rooms, objects, energyData]);

    const filteredGhosts = useMemo(() =>
        ghostObjects.filter((g) => !objects.some((o) => o.roomId === g.roomId && o.type === g.type)),
        [ghostObjects, objects]
    );

    const handlePointerMissed = () => { setSelectedId(null); setPinnedDeviceId(null); };

    return (
        <group onPointerMissed={handlePointerMissed}>
            <CameraControls maxDistance={60} minDistance={2} />
            <KeyboardCameraControls />

            <Lights />

            <SceneBackground isDark={isDark} />
            {isDark ? (
                <>
                    <Stars radius={100} depth={50} count={4000} factor={4} saturation={0} fade speed={0.5} />
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
                    <DecorativeClouds />
                </>
            )}

            {/* Ground plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.005, 0]} receiveShadow>
                <planeGeometry args={[200, 200]} />
                <meshStandardMaterial color={isDark ? '#2a3a26' : '#5d8a4e'} roughness={0.95} metalness={0} />
            </mesh>

            <GardenProps />

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

            <ElectricHub />
            <ElectricWiring />

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

            {filteredGhosts.map((ghost) => (
                <GhostDevice
                    key={ghost.id}
                    ghost={ghost}
                    onGhostClick={onGhostClick || (() => {})}
                    onGhostDismiss={onGhostDismiss || (() => {})}
                />
            ))}

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

            {objects.map((obj) => (
                <EnergyBadge
                    key={`badge-${obj.id}`}
                    objectId={obj.id}
                    object={obj}
                    heightOffset={0.3}
                />
            ))}

            {objects.map((obj) => (
                <DeviceInfoPopup
                    key={`popup-${obj.id}`}
                    object={obj}
                    energyData={energyData[obj.id]}
                />
            ))}

            {children}
        </group>
    );
};

// ─── SceneBackground ────────────────────────────────────────────────────────
const NIGHT_BG = new THREE.Color('#070b18');
function SceneBackground({ isDark }) {
    const { scene } = useThree();
    useEffect(() => {
        const prev = scene.background;
        scene.background = isDark ? NIGHT_BG : null;
        return () => { scene.background = prev; };
    }, [isDark, scene]);
    return null;
}

// ─── DecorativeClouds — shared geometry & material via useMemo ──────────────
const CLOUD_PUFFS = [
    { p: [-22, 18, -14], r: 2.6 }, { p: [-18, 18, -14], r: 2.0 }, { p: [-20, 19, -16], r: 1.8 },
    { p: [16, 22, -20],  r: 2.4 }, { p: [19, 22, -18], r: 1.9 },
    { p: [4,  24, 22],   r: 2.2 }, { p: [7,  24, 22],  r: 1.7 }, { p: [5, 25, 20], r: 1.5 },
    { p: [-8, 20, 24],   r: 2.0 }, { p: [-5, 20, 24],  r: 1.6 },
];
const cloudMaterial = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false });

function DecorativeClouds() {
    const geometries = useMemo(
        () => CLOUD_PUFFS.map((c) => new THREE.SphereGeometry(c.r, 12, 8)),
        [],
    );

    useEffect(() => () => geometries.forEach((g) => g.dispose()), [geometries]);

    return (
        <group>
            {CLOUD_PUFFS.map((c, i) => (
                <mesh key={i} position={c.p} geometry={geometries[i]} material={cloudMaterial} />
            ))}
        </group>
    );
}

export default SceneContainer;

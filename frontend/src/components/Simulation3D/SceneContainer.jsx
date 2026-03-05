import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import Lights from './Lights';
import RoomBuilder from './RoomBuilder';
import CameraControls from './CameraControls';
import DraggableObject from './DraggableObject';
import useCollision from './useCollision';
import './SceneContainer.css';

/**
 * SceneContainer.jsx — İzole 3D Sahne Bileşeni
 *
 * KWhane projesinin herhangi bir sayfasına bağımsız olarak
 * monte edilebilen ana 3D sahne konteyner bileşenidir.
 *
 * Props:
 *  - width    : Oda genişliği, metre (varsayılan: 5)
 *  - depth    : Oda derinliği, metre (varsayılan: 4)
 *  - height   : Oda yüksekliği, metre (varsayılan: 3)
 *  - children : Opsiyonel — sahneye ek 3D bileşenler eklemek için
 *
 * Kullanım:
 *  import { SceneContainer, DraggableObject, DeviceModel } from './components/Simulation3D';
 *
 *  <SceneContainer width={6} depth={5} height={3} />
 */
const SceneContainer = ({ width = 5, depth = 4, height = 3, children }) => {
    const cameraDistance = Math.max(width, depth) * 1.5;

    return (
        <div className="scene-container">
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
                    {/* ─── İç Sahne (Collision hook burada) ──── */}
                    <SceneContent width={width} depth={depth} height={height}>
                        {children}
                    </SceneContent>
                </Canvas>
            </Suspense>
        </div>
    );
};

/**
 * SceneContent — Canvas içindeki sahne içeriği
 *
 * useCollision hook'u R3F Canvas bağlamı içinde çağrılmalıdır,
 * bu yüzden ayrı bir iç bileşen olarak tanımlanmıştır.
 */
const SceneContent = ({ width, depth, height, children }) => {
    const collision = useCollision();
    const room = { width, depth };

    return (
        <>
            {/* ─── Kamera Kontrolleri ────────────────────── */}
            <CameraControls maxDistance={Math.max(width, depth) * 3} minDistance={2} />

            {/* ─── Aydınlatma ───────────────────────────── */}
            <Lights />

            {/* ─── Zemin Izgarası ───────────────────────── */}
            <Grid
                args={[50, 50]}
                cellSize={0.5}
                cellThickness={0.5}
                cellColor="#334155"
                sectionSize={1}
                sectionThickness={1}
                sectionColor="#475569"
                fadeDistance={30}
                fadeStrength={1}
                followCamera={false}
                infiniteGrid={false}
                position={[0, -0.001, 0]}
            />

            {/* ─── Oda ─────────────────────────────────── */}
            <RoomBuilder width={width} depth={depth} height={height} />

            {/* ─── Demo: Sürüklenebilir + Çarpışmalı kutular ─ */}
            <DraggableObject
                position={[-1, 0.5, 0]}
                gridSnap={0.5}
                collision={collision}
                objectId="demo-box-1"
                objectSize={[0.6, 1.0, 0.6]}
                room={room}
            >
                <mesh castShadow>
                    <boxGeometry args={[0.6, 1.0, 0.6]} />
                    <meshStandardMaterial color="#f59e0b" />
                </mesh>
            </DraggableObject>

            <DraggableObject
                position={[1, 0.5, 1]}
                gridSnap={0.5}
                collision={collision}
                objectId="demo-box-2"
                objectSize={[0.8, 1.5, 0.6]}
                room={room}
            >
                <mesh castShadow>
                    <boxGeometry args={[0.8, 1.5, 0.6]} />
                    <meshStandardMaterial color="#3b82f6" />
                </mesh>
            </DraggableObject>

            {/* Dışarıdan eklenen ek 3D bileşenler */}
            {children}
        </>
    );
};

export default SceneContainer;

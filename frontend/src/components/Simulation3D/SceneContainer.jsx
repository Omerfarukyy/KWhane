import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import Lights from './Lights';
import RoomBuilder from './RoomBuilder';
import CameraControls from './CameraControls';
import DraggableObject from './DraggableObject';
import ProceduralDevices from './ProceduralDevices';
import useCollision from './useCollision';
import useSceneStore from '../../store/useSceneStore';
import './SceneContainer.css';

/**
 * SceneContainer.jsx — İzole 3D Sahne Bileşeni
 *
 * KWhane projesinin herhangi bir sayfasına bağımsız olarak
 * monte edilebilen ana 3D sahne konteyner bileşenidir.
 */
const SceneContainer = ({ children }) => {
    // Uzak kamera mesafesi, çoklu odalar için daha geniş açıyla başlatıyoruz
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
                    <SceneContent>
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
const SceneContent = ({ children }) => {
    const collision = useCollision();

    // Zustand Store'dan dinamik verileri al
    const rooms = useSceneStore((state) => state.rooms);
    const objects = useSceneStore((state) => state.objects);
    const setSelectedId = useSceneStore((state) => state.setSelectedId);

    // Boşluğa (Grid'e veya Arka Plana) tıklanınca seçimi kaldır
    const handlePointerMissed = () => {
        setSelectedId(null);
    };

    return (
        <group onPointerMissed={handlePointerMissed}>
            {/* ─── Kamera Kontrolleri ────────────────────── */}
            <CameraControls maxDistance={60} minDistance={2} />

            {/* ─── Aydınlatma ───────────────────────────── */}
            <Lights />

            {/* ─── Zemin Izgarası ───────────────────────── */}
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

            {/* ─── Dinamik Odalar ─────────────────────────────────── */}
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

            {/* ─── Dinamik Objeler ─────────────────────────────────── */}
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
                        floorY={obj.position[1]} // Objenin mevcut Y yüksekliğini koru (duvar montajı için)
                    >
                        {/* Elektronik Aletler */}
                        {['television', 'air_conditioner', 'fridge', 'washing_machine'].includes(obj.type) ? (
                            <ProceduralDevices type={obj.type} size={obj.size} />
                        ) : (
                            /* Demo Kutu */
                            obj.type === 'box' && (
                                <mesh castShadow position={[0, obj.size[1] / 2, 0]}>
                                    <boxGeometry args={obj.size} />
                                    <meshStandardMaterial color={obj.color} />
                                </mesh>
                            )
                        )}
                    </DraggableObject>
                );
            })}

            {/* Dışarıdan eklenen ek 3D bileşenler */}
            {children}
        </group>
    );
};

export default SceneContainer;

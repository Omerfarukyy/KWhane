import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import Lights from './Lights';
import RoomBuilder from './RoomBuilder';
import CameraControls from './CameraControls';
import DraggableObject from './DraggableObject';
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
 *  import { SceneContainer, DraggableObject } from './components/Simulation3D';
 *
 *  <SceneContainer width={6} depth={5} height={3}>
 *    <DraggableObject position={[1, 0, 2]}>
 *      <mesh>
 *        <boxGeometry args={[0.6, 1.8, 0.7]} />
 *        <meshStandardMaterial color="#f59e0b" />
 *      </mesh>
 *    </DraggableObject>
 *  </SceneContainer>
 */
const SceneContainer = ({ width = 5, depth = 4, height = 3, children }) => {
    /**
     * Kamera başlangıç pozisyonu:
     * Odanın boyutuna göre uyarlanır, perspektif açısıyla
     * odayı kuşbakışı-çapraz açıdan gösterir.
     */
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
                    // Sahne arka plan rengi — koyu lacivert
                    onCreated={({ gl }) => {
                        gl.setClearColor('#0f172a');
                    }}
                >
                    {/* ─── Kamera Kontrolleri ────────────────────── */}
                    <CameraControls maxDistance={Math.max(width, depth) * 3} minDistance={2} />

                    {/* ─── Aydınlatma ───────────────────────────── */}
                    <Lights />

                    {/* ─── Zemin Izgarası (GridHelper) ──────────── */}
                    {/*
           * Grid bileşeni zemin düzleminde (Y=0) referans
           * çizgileri gösterir. 0.5 birimlik (50 cm) aralıklarla
           * alt ızgara, 1 birimlik (1 m) aralıklarla ana ızgara.
           */}
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

                    {/* ─── Demo: Sürüklenebilir test kutusu ───── */}
                    {/*
           * Aşama 2 doğrulaması için örnek bir sürüklenebilir obje.
           * Sol tık ile tutup XZ düzleminde sürükleyebilirsiniz.
           * Bıraktığınızda 0.5 birimlik ızgaraya hizalanır.
           */}
                    <DraggableObject position={[0, 0.5, 0]} gridSnap={0.5}>
                        <mesh castShadow>
                            <boxGeometry args={[0.6, 1.0, 0.6]} />
                            <meshStandardMaterial color="#f59e0b" />
                        </mesh>
                    </DraggableObject>

                    {/* Dışarıdan eklenen ek 3D bileşenler */}
                    {children}
                </Canvas>
            </Suspense>
        </div>
    );
};

export default SceneContainer;

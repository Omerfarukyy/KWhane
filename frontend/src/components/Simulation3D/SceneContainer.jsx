import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { Grid } from '@react-three/drei';
import Lights from './Lights';
import RoomBuilder from './RoomBuilder';
import './SceneContainer.css';

/**
 * SceneContainer.jsx — İzole 3D Sahne Bileşeni
 *
 * KWhane projesinin herhangi bir sayfasına bağımsız olarak
 * monte edilebilen ana 3D sahne konteyner bileşenidir.
 *
 * Props:
 *  - width  : Oda genişliği, metre (varsayılan: 5)
 *  - depth  : Oda derinliği, metre (varsayılan: 4)
 *  - height : Oda yüksekliği, metre (varsayılan: 3)
 *
 * Kullanım:
 *  import { SceneContainer } from './components/Simulation3D';
 *  <SceneContainer width={6} depth={5} height={3} />
 */
const SceneContainer = ({ width = 5, depth = 4, height = 3 }) => {
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
                        position={[0, -0.001, 0]} // Zemin ile z-fighting önlemek için hafifçe aşağıda
                    />

                    {/* ─── Oda ─────────────────────────────────── */}
                    <RoomBuilder width={width} depth={depth} height={height} />
                </Canvas>
            </Suspense>
        </div>
    );
};

export default SceneContainer;

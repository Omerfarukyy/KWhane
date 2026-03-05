import { useRef, useState, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * DraggableObject.jsx — Sürüklenebilir 3D Obje Sarmalayıcı
 *
 * Sahneye eklenen objelerin sadece zemin üzerinde (Y ekseni sabit)
 * hareket ettirilmesini sağlar. Obje bırakıldığında pozisyon
 * GRID_SNAP birimlik (varsayılan 0.5m) ızgara noktalarına hizalanır.
 *
 * Props:
 *  - position  : [x, y, z] başlangıç pozisyonu
 *  - gridSnap  : Hizalama aralığı (varsayılan: 0.5 birim = 50 cm)
 *  - floorY    : Zemin Y seviyesi (varsayılan: 0)
 *  - onPositionChange : Pozisyon değiştiğinde çağrılır (opsiyonel callback)
 *  - children  : İçine konulacak 3D mesh/group
 *
 * Kullanım:
 *  <DraggableObject position={[1, 0, 2]} gridSnap={0.5}>
 *    <mesh>
 *      <boxGeometry args={[1, 1, 1]} />
 *      <meshStandardMaterial color="orange" />
 *    </mesh>
 *  </DraggableObject>
 */

const DEFAULT_GRID_SNAP = 0.5;

// Pozisyonu grid'e hizala
const snapToGrid = (value, snap) => Math.round(value / snap) * snap;

const DraggableObject = ({
    position = [0, 0, 0],
    gridSnap = DEFAULT_GRID_SNAP,
    floorY = 0,
    onPositionChange,
    children,
}) => {
    const groupRef = useRef();
    const [isDragging, setIsDragging] = useState(false);
    const { camera, gl, raycaster } = useThree();

    // Sürükleme düzlemi — Y ekseni sabit, XZ düzleminde hareket
    const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
    const intersection = useRef(new THREE.Vector3());
    const offset = useRef(new THREE.Vector3());

    // Pointer down — sürüklemeyi başlat
    const handlePointerDown = useCallback(
        (e) => {
            e.stopPropagation();
            setIsDragging(true);

            // Canvas'ın pointer event'lerini yakala
            gl.domElement.style.cursor = 'grabbing';
            (e.target ?? gl.domElement).setPointerCapture(e.pointerId);

            // Sürükleme düzlemini objenin Y seviyesine ayarla
            dragPlane.current.constant = -groupRef.current.position.y;

            // Mouse pozisyonunu düzlemle kesişim noktasına çevir
            raycaster.ray.intersectPlane(dragPlane.current, intersection.current);

            // Obje merkezi ile tıklama noktası arasındaki offset'i hesapla
            offset.current
                .copy(groupRef.current.position)
                .sub(intersection.current);
        },
        [gl, raycaster]
    );

    // Pointer move — sürükleme sırasında pozisyon güncelle
    const handlePointerMove = useCallback(
        (e) => {
            if (!isDragging) return;
            e.stopPropagation();

            raycaster.ray.intersectPlane(dragPlane.current, intersection.current);

            if (groupRef.current) {
                // X ve Z serbestçe hareket, Y sabit
                groupRef.current.position.x = intersection.current.x + offset.current.x;
                groupRef.current.position.z = intersection.current.z + offset.current.z;
                groupRef.current.position.y = floorY;
            }
        },
        [isDragging, raycaster, floorY]
    );

    // Pointer up — sürüklemeyi bitir ve grid'e hizala
    const handlePointerUp = useCallback(
        (e) => {
            if (!isDragging) return;
            e.stopPropagation();
            setIsDragging(false);

            gl.domElement.style.cursor = 'grab';

            if (groupRef.current) {
                // Grid snapping uygula
                const snappedX = snapToGrid(groupRef.current.position.x, gridSnap);
                const snappedZ = snapToGrid(groupRef.current.position.z, gridSnap);

                groupRef.current.position.x = snappedX;
                groupRef.current.position.z = snappedZ;
                groupRef.current.position.y = floorY;

                // Callback varsa yeni pozisyonu bildir
                if (onPositionChange) {
                    onPositionChange([snappedX, floorY, snappedZ]);
                }
            }
        },
        [isDragging, gl, gridSnap, floorY, onPositionChange]
    );

    return (
        <group
            ref={groupRef}
            position={position}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerOver={() => {
                if (!isDragging) gl.domElement.style.cursor = 'grab';
            }}
            onPointerOut={() => {
                if (!isDragging) gl.domElement.style.cursor = 'auto';
            }}
        >
            {children}
        </group>
    );
};

export default DraggableObject;

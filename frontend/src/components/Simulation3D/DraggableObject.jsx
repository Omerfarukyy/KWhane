import { useRef, useState, useCallback, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * DraggableObject.jsx — Sürüklenebilir 3D Obje Sarmalayıcı
 *
 * Sahneye eklenen objelerin sadece zemin üzerinde (Y ekseni sabit)
 * hareket ettirilmesini sağlar. Obje bırakıldığında pozisyon
 * GRID_SNAP birimlik (varsayılan 0.5m) ızgara noktalarına hizalanır.
 *
 * Çarpışma Desteği (Aşama 3):
 *  - collision   : useCollision hook referansı (opsiyonel)
 *  - objectId    : Çarpışma sistemindeki benzersiz kimlik
 *  - objectSize  : Obje boyutları [w, h, d] (duvar sınır kontrolü için)
 *  - room        : Oda boyutları { width, depth } (duvar sınır kontrolü için)
 *
 * Props:
 *  - position  : [x, y, z] başlangıç pozisyonu
 *  - gridSnap  : Hizalama aralığı (varsayılan: 0.5 birim = 50 cm)
 *  - floorY    : Zemin Y seviyesi (varsayılan: 0)
 *  - onPositionChange : Pozisyon değiştiğinde çağrılır (opsiyonel callback)
 *  - collision  : useCollision hook referansı (opsiyonel)
 *  - objectId   : Benzersiz obje kimliği (collision için)
 *  - objectSize : [w, h, d] obje boyutları (duvar kontrolü için)
 *  - room       : { width, depth } oda boyutları (duvar kontrolü için)
 *  - children   : İçine konulacak 3D mesh/group
 *
 * Kullanım:
 *  <DraggableObject
 *    position={[1, 0, 2]}
 *    gridSnap={0.5}
 *    collision={collisionHook}
 *    objectId="fridge-1"
 *    objectSize={[0.7, 1.8, 0.7]}
 *    room={{ width: 6, depth: 5 }}
 *  >
 *    <mesh>
 *      <boxGeometry args={[0.7, 1.8, 0.7]} />
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
    collision,
    objectId,
    objectSize = [1, 1, 1],
    room,
    children,
}) => {
    const groupRef = useRef();
    const [isDragging, setIsDragging] = useState(false);
    const [isColliding, setIsColliding] = useState(false);
    const { camera, gl, raycaster } = useThree();

    // Sürükleme düzlemi — Y ekseni sabit, XZ düzleminde hareket
    const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
    const intersection = useRef(new THREE.Vector3());
    const offset = useRef(new THREE.Vector3());
    // Çarpışma öncesi son geçerli pozisyon
    const lastValidPos = useRef(new THREE.Vector3(...position));

    // Collision sistemine kayıt
    useEffect(() => {
        if (collision && objectId && groupRef.current) {
            collision.register(objectId, groupRef.current);
            return () => collision.unregister(objectId);
        }
    }, [collision, objectId]);

    // Pointer down — sürüklemeyi başlat
    const handlePointerDown = useCallback(
        (e) => {
            e.stopPropagation();
            setIsDragging(true);

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

            // Mevcut pozisyonu son geçerli pozisyon olarak kaydet
            lastValidPos.current.copy(groupRef.current.position);
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
                let newX = intersection.current.x + offset.current.x;
                let newZ = intersection.current.z + offset.current.z;

                // Duvar sınır kontrolü
                if (room && collision) {
                    const clamped = collision.checkWallCollision(
                        [newX, floorY, newZ],
                        objectSize,
                        room
                    );
                    newX = clamped[0];
                    newZ = clamped[2];
                }

                // Obje–obje çarpışma kontrolü
                if (collision && objectId) {
                    const testPos = new THREE.Vector3(newX, floorY, newZ);
                    const result = collision.checkCollision(objectId, testPos);

                    if (result.collides) {
                        // Çarpışma var — pozisyonu güncelleme, kırmızı göster
                        setIsColliding(true);
                        return;
                    }
                }

                setIsColliding(false);
                groupRef.current.position.x = newX;
                groupRef.current.position.z = newZ;
                groupRef.current.position.y = floorY;
                lastValidPos.current.set(newX, floorY, newZ);
            }
        },
        [isDragging, raycaster, floorY, collision, objectId, objectSize, room]
    );

    // Pointer up — sürüklemeyi bitir ve grid'e hizala
    const handlePointerUp = useCallback(
        (e) => {
            if (!isDragging) return;
            e.stopPropagation();
            setIsDragging(false);
            setIsColliding(false);

            gl.domElement.style.cursor = 'grab';

            if (groupRef.current) {
                // Grid snapping uygula
                let snappedX = snapToGrid(groupRef.current.position.x, gridSnap);
                let snappedZ = snapToGrid(groupRef.current.position.z, gridSnap);

                // Snap sonrası da duvar sınır kontrolü
                if (room && collision) {
                    const clamped = collision.checkWallCollision(
                        [snappedX, floorY, snappedZ],
                        objectSize,
                        room
                    );
                    snappedX = clamped[0];
                    snappedZ = clamped[2];
                }

                // Snap sonrası çarpışma kontrolü
                if (collision && objectId) {
                    const testPos = new THREE.Vector3(snappedX, floorY, snappedZ);
                    const result = collision.checkCollision(objectId, testPos);
                    if (result.collides) {
                        // Çarpışma varsa son geçerli pozisyona geri dön
                        groupRef.current.position.copy(lastValidPos.current);
                        return;
                    }
                }

                groupRef.current.position.x = snappedX;
                groupRef.current.position.z = snappedZ;
                groupRef.current.position.y = floorY;

                // Callback varsa yeni pozisyonu bildir
                if (onPositionChange) {
                    onPositionChange([snappedX, floorY, snappedZ]);
                }
            }
        },
        [isDragging, gl, gridSnap, floorY, onPositionChange, collision, objectId, objectSize, room]
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

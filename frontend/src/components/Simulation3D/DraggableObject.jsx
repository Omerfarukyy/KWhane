import { useRef, useState, useCallback, useEffect } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useSceneStore, { objectRefs } from '../../store/useSceneStore';

/**
 * DraggableObject.jsx — Sürüklenebilir 3D Obje Sarmalayıcı
 *
 * Çarpışma Desteği (Aşama 3) & Seçim/Rotasyon (Aşama 2.5):
 *  - rotation    : Y ekseninde radyan cinsinden dönüş (State'den gelir)
 *  - isSelected  : Seçili durum efekti (State üzerinden kontrol)
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
 * Props:
 *  - position   : [x, y, z] başlangıç pozisyonu
 *  - rotation   : Y eksenindeki rotasyon açısı
 *  - gridSnap   : Hizalama aralığı (varsayılan: 0.5 birim = 50 cm)
 *  - floorY     : Zemin Y seviyesi (varsayılan: 0)
 *  - collision  : useCollision hook referansı
 *  - objectId   : Benzersiz obje kimliği (Store ve Collision için)
 *  - objectSize : [w, h, d] obje boyutları (duvar kontrolü için)
 *  - room       : { position, size } oda verisi (duvar/çarpışma offset için)
 *  - children   : İçine konulacak 3D mesh/group
 */

const DEFAULT_GRID_SNAP = 0.5;

// Pozisyonu grid'e hizala
const snapToGrid = (value, snap) => Math.round(value / snap) * snap;

const DraggableObject = ({
    position = [0, 0, 0],
    rotation = 0,
    gridSnap = DEFAULT_GRID_SNAP,
    floorY = 0,
    collision,
    objectId,
    objectSize = [1, 1, 1],
    room,
    children,
}) => {
    const groupRef = useRef();
    const [isDragging, setIsDragging] = useState(false);
    const [isColliding, setIsColliding] = useState(false);

    // Zustand State
    const selectedId = useSceneStore((state) => state.selectedId);
    const setSelectedId = useSceneStore((state) => state.setSelectedId);
    const updateObjectPosition = useSceneStore((state) => state.updateObjectPosition);
    const setIsDraggingStore = useSceneStore((state) => state.setIsDragging);
    const isCreationMode = useSceneStore((state) => state.isCreationMode);

    const isSelected = selectedId === objectId;

    const { camera, gl, raycaster, controls } = useThree();

    // Sürükleme düzlemi — Y ekseni sabit, XZ düzleminde hareket
    const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
    const intersection = useRef(new THREE.Vector3());
    const offset = useRef(new THREE.Vector3());
    // Çarpışma öncesi son geçerli pozisyon
    const lastValidPos = useRef(new THREE.Vector3(...position));

    // Collision ve SceneStore Drag sistemine kayıt
    useEffect(() => {
        if (objectId && groupRef.current) {
            objectRefs[objectId] = groupRef.current;
            if (collision) collision.register(objectId, groupRef.current);
            return () => {
                delete objectRefs[objectId];
                if (collision) collision.unregister(objectId);
            };
        }
    }, [collision, objectId]);

    // Pointer down — sürüklemeyi başlat
    const handlePointerDown = useCallback(
        (e) => {
            if (!isCreationMode) return;
            if (e.pointerType === 'mouse' && e.button !== 0) return; // Sadece sol tık
            // Sadece farenin sol tuşuna (veya dokunmaya) tepki ver, sağ tuş vb yoksay
            e.stopPropagation();
            if (controls) controls.enabled = false; // Kamerayı kesin kilitle
            setIsDragging(true);
            setIsDraggingStore(true);

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
        [gl, raycaster, isCreationMode]
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
            if (controls) controls.enabled = true; // Kamerayı serbest bırak
            setIsDragging(false);
            setIsDraggingStore(false);
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
                // Zustand Store'daki global pozisyonu güncelle
                if (objectId) {
                    updateObjectPosition(objectId, [snappedX, floorY, snappedZ]);
                }
            }
        },
        [isDragging, gl, gridSnap, floorY, updateObjectPosition, collision, objectId, objectSize, room]
    );

    /**
     * Pürüzsüz Rotasyon Animasyonu
     * State üzerinden gelen hedef `rotation` açısına doğru
     * objenin Y eksenini yumuşak bir şekilde interpole eder.
     */
    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y = THREE.MathUtils.lerp(
                groupRef.current.rotation.y,
                rotation,
                10 * delta
            );
        }
    });

    return (
        <group
            ref={groupRef}
            position={position}
            onPointerDown={(e) => {
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                setSelectedId(objectId);
                handlePointerDown(e);
            }}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerOver={(e) => {
                e.stopPropagation();
                if (!isDragging) gl.domElement.style.cursor = 'grab';
            }}
            onPointerOut={(e) => {
                if (!isDragging) gl.domElement.style.cursor = 'auto';
            }}
        >
            {/* Seçim Vurgusu (Highlight Box) */}
            {isSelected && (
                <mesh position={[0, objectSize[1] / 2, 0]}>
                    <boxGeometry args={[objectSize[0] + 0.05, objectSize[1] + 0.05, objectSize[2] + 0.05]} />
                    <meshBasicMaterial color="#ef4444" wireframe transparent opacity={0.5} />
                </mesh>
            )}

            {/* Gerçek Obje (Rotasyon uygulandıktan sonraki hali) */}
            <group>
                {children}
            </group>
        </group>
    );
};

export default DraggableObject;

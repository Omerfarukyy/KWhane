import { useMemo, useRef, useState, useCallback } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import useSceneStore from '../../store/useSceneStore';

/**
 * RoomBuilder.jsx — Dinamik Oda Oluşturucu
 *
 * Props:
 *  - id     : Oda ID'si
 *  - name   : Oda Adı
 *  - width  : Oda genişliği (X ekseni, metre)
 *  - depth  : Oda derinliği (Z ekseni, metre)
 *  - height : Oda yüksekliği (Y ekseni, metre)
 *  - position: [x, y, z] başlangıç pozisyonu
 *
 * Ölçü standardı: 1 Birim = 1 Metre
 * Duvar kalınlığı: 0.1 birim (10 cm)
 */

const WALL_THICKNESS = 0.1;

// Normal ve Seçili Durum Malzemeleri
const wallMatNormal = { color: '#8ecae6', transparent: true, opacity: 0.35, side: 2 };
const wallMatSelected = { color: '#0ea5e9', transparent: true, opacity: 0.6, side: 2 };

const floorMatNormal = { color: '#e0e0e0', side: 2 };
const floorMatSelected = { color: '#cbd5e1', side: 2 };

const RoomBuilder = ({ id, width = 5, depth = 4, height = 3, position = [0, 0, 0] }) => {
    const groupRef = useRef();
    const [isDragging, setIsDragging] = useState(false);

    const selectedId = useSceneStore((state) => state.selectedId);
    const setSelectedId = useSceneStore((state) => state.setSelectedId);
    const setIsDraggingStore = useSceneStore((state) => state.setIsDragging);
    const updateRoomPosition = useSceneStore((state) => state.updateRoomPosition);
    const rooms = useSceneStore((state) => state.rooms);

    const isSelected = selectedId === id;
    const wallMaterialProps = isSelected ? wallMatSelected : wallMatNormal;
    const floorMaterialProps = isSelected ? floorMatSelected : floorMatNormal;

    const { gl, raycaster, controls } = useThree();

    // Sürükleme düzlemi — Zemin sıfırda kabul ediliyor (Y ekseni = 0)
    const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
    const intersection = useRef(new THREE.Vector3());
    const offset = useRef(new THREE.Vector3());
    const lastValidPos = useRef(new THREE.Vector3(...position));
    /**
     * Duvar pozisyonları ve boyutları hesaplanır.
     * Duvarlar oda sınırlarının dış kenarına yerleştirilir,
     * iç hacim tam olarak width × depth × height olur.
     */
    const walls = useMemo(() => {
        const halfW = width / 2;
        const halfD = depth / 2;
        const halfH = height / 2;

        return [
            {
                // Arka duvar (–Z yönü)
                name: 'wall-back',
                position: [0, halfH, -halfD],
                size: [width + WALL_THICKNESS * 2, height, WALL_THICKNESS],
            },
            {
                // Ön duvar (+Z yönü)
                name: 'wall-front',
                position: [0, halfH, halfD],
                size: [width + WALL_THICKNESS * 2, height, WALL_THICKNESS],
            },
            {
                // Sol duvar (–X yönü)
                name: 'wall-left',
                position: [-halfW, halfH, 0],
                size: [WALL_THICKNESS, height, depth],
            },
            {
                // Sağ duvar (+X yönü)
                name: 'wall-right',
                position: [halfW, halfH, 0],
                size: [WALL_THICKNESS, height, depth],
            },
        ];
    }, [width, depth, height]);

    // Odanın diğer odalarla çarpışıp çarpışmadığını kontrol et (Basit AABB)
    const checkRoomOverlap = useCallback((testX, testZ) => {
        const halfW = width / 2;
        const halfD = depth / 2;

        // Yeni pozisyona göre kendi kutumuz
        const minX1 = testX - halfW;
        const maxX1 = testX + halfW;
        const minZ1 = testZ - halfD;
        const maxZ1 = testZ + halfD;

        for (const other of rooms) {
            if (other.id === id) continue; // Kendini atla

            const oHW = other.size.width / 2;
            const oHD = other.size.depth / 2;
            const oX = other.position[0];
            const oZ = other.position[2];

            const minX2 = oX - oHW;
            const maxX2 = oX + oHW;
            const minZ2 = oZ - oHD;
            const maxZ2 = oZ + oHD;

            // Kapsamlı kesişim kontrolü zemin (X-Z) eksenleri için
            // Precision problemleri için 0.01 margin eklendi, tam 0 olunca yan yana yapışabilir
            if (maxX1 - 0.01 > minX2 && minX1 + 0.01 < maxX2 && maxZ1 - 0.01 > minZ2 && minZ1 + 0.01 < maxZ2) {
                return true; // Overlap var
            }
        }
        return false;
    }, [rooms, id, width, depth]);

    // Odaya/Zemine tıklandığında sürükleme başlat
    const handlePointerDown = useCallback((e) => {
        // Objelere tıklanıp odanın da sürüklenmesini önlemek için:
        if (e.object.name !== 'floor') return;

        e.stopPropagation();
        if (controls) controls.enabled = false;
        setSelectedId(id);
        setIsDragging(true);
        setIsDraggingStore(true);

        gl.domElement.style.cursor = 'grabbing';
        (e.target ?? gl.domElement).setPointerCapture(e.pointerId);

        // Raycast ile tıklanan noktayı bul
        raycaster.ray.intersectPlane(dragPlane.current, intersection.current);

        // Oda merkezi ile tıklama noktası arasındaki offset
        offset.current.copy(groupRef.current.position).sub(intersection.current);
        lastValidPos.current.copy(groupRef.current.position);
    }, [gl, raycaster, id, setSelectedId, setIsDraggingStore, controls]);

    const handlePointerMove = useCallback((e) => {
        if (!isDragging) return;
        e.stopPropagation();

        raycaster.ray.intersectPlane(dragPlane.current, intersection.current);

        if (groupRef.current) {
            let newX = intersection.current.x + offset.current.x;
            let newZ = intersection.current.z + offset.current.z;

            // Görsel olarak diğer odaya girmeyi anında engelle
            if (checkRoomOverlap(newX, newZ)) {
                return;
            }

            groupRef.current.position.x = newX;
            groupRef.current.position.z = newZ;
            lastValidPos.current.set(newX, 0, newZ);
        }
    }, [isDragging, raycaster, checkRoomOverlap]);

    const handlePointerUp = useCallback((e) => {
        if (!isDragging) return;
        e.stopPropagation();
        if (controls) controls.enabled = true;
        setIsDragging(false);
        setIsDraggingStore(false);

        gl.domElement.style.cursor = 'grab';

        if (groupRef.current) {
            // GRID_SNAP = 0.5
            let snappedX = Math.round(groupRef.current.position.x / 0.5) * 0.5;
            let snappedZ = Math.round(groupRef.current.position.z / 0.5) * 0.5;

            // Çarpışma kontrolü
            if (checkRoomOverlap(snappedX, snappedZ)) {
                // Diğer odaya girdiyse rollback yap
                groupRef.current.position.copy(lastValidPos.current);
            } else {
                groupRef.current.position.x = snappedX;
                groupRef.current.position.z = snappedZ;
                updateRoomPosition(id, [snappedX, 0, snappedZ]);
            }
        }
    }, [isDragging, gl, checkRoomOverlap, updateRoomPosition, id, setIsDraggingStore]);

    return (
        <group
            ref={groupRef}
            name={`room-${id}`}
            position={position}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerOver={(e) => {
                if (!isDragging && e.object.name === 'floor') gl.domElement.style.cursor = 'grab';
            }}
            onPointerOut={(e) => {
                if (!isDragging) gl.domElement.style.cursor = 'auto';
            }}
            onClick={(e) => {
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                if (e.object.name === 'floor' || e.object.name.startsWith('wall')) {
                    e.stopPropagation();
                    setSelectedId(id);
                }
            }}
        >
            {/* ─── Zemin ─────────────────────────────────────────── */}
            <mesh
                name="floor"
                rotation={[-Math.PI / 2, 0, 0]}
                // Z-fighting'i önlemek için zemini (Grid'den) çok hafif yukarı alıyoruz
                position={[0, 0.01, 0]}
                receiveShadow
            >
                <planeGeometry args={[width, depth]} />
                <meshStandardMaterial {...floorMaterialProps} />
            </mesh>

            {/* ─── Duvarlar ──────────────────────────────────────── */}
            {walls.map((wall) => (
                <mesh
                    key={wall.name}
                    name={wall.name}
                    position={wall.position}
                    castShadow
                    receiveShadow
                >
                    <boxGeometry args={wall.size} />
                    <meshStandardMaterial {...wallMaterialProps} />
                </mesh>
            ))}
        </group>
    );
};

export default RoomBuilder;

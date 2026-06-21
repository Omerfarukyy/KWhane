import { useRef, useCallback } from 'react';
import * as THREE from 'three';

/**
 * useCollision.js — Çarpışma Algılama Hook'u
 *
 * Sahneye eklenen tüm objelerin Axis-Aligned Bounding Box (AABB)
 * hesaplamasını yapar ve çarpışma kontrolü sağlar.
 *
 * Özellikler:
 *  - register(id, mesh)   : Objeyi çarpışma sistemine kaydeder
 *  - unregister(id)       : Objeyi çarpışma sisteminden çıkarır
 *  - checkCollision(id, newPos) : Yeni pozisyonda çarpışma var mı kontrol eder
 *  - checkWallCollision(pos, size, room) : Duvar sınırlarını kontrol eder
 *
 * Ölçü: 1 birim = 1 metre
 *
 * Kullanım:
 *  const { register, unregister, checkCollision, checkWallCollision } = useCollision();
 */
const useCollision = () => {
    // Kayıtlı objelerin haritası: { id: { mesh, boundingBox } }
    const objectsRef = useRef(new Map());
    const staticRoomsRef = useRef(new Map());

    /**
     * Bir mesh'in dünya koordinatlarındaki AABB'sini hesapla.
     * Objenin geometry'sinden boundingBox alınır ve matrixWorld ile
     * dünya koordinatlarına dönüştürülür.
     */
    const computeWorldAABB = useCallback((mesh) => {
        const box = new THREE.Box3();
        // Mesh ve tüm alt nesnelerini kapsayan bounding box
        box.setFromObject(mesh);
        return box;
    }, []);

    /**
     * Objeyi çarpışma sistemine kaydet
     * @param {string} id     — Benzersiz obje kimliği
     * @param {THREE.Object3D} object — Three.js mesh/group referansı
     */
    const register = useCallback(
        (id, object) => {
            if (!object) return;
            objectsRef.current.set(id, { object });
        },
        []
    );

    /**
     * Objeyi çarpışma sisteminden çıkar
     * @param {string} id — Obje kimliği
     */
    const unregister = useCallback((id) => {
        objectsRef.current.delete(id);
    }, []);

    // Register one stable collision proxy per furniture item. This avoids
    // traversing every mesh in asynchronously loaded GLTF scenes.
    const registerStaticBoxes = useCallback((roomId, proxies) => {
        const boxes = proxies.map(({ center, size }) => {
            const half = new THREE.Vector3(size[0] / 2, size[1] / 2, size[2] / 2);
            const centerVector = new THREE.Vector3(center[0], center[1], center[2]);
            return new THREE.Box3(centerVector.clone().sub(half), centerVector.clone().add(half));
        });
        staticRoomsRef.current.set(roomId, boxes);
    }, []);

    const unregisterStaticRoom = useCallback((roomId) => {
        staticRoomsRef.current.delete(roomId);
    }, []);

    /**
     * Belirli bir objenin yeni pozisyonunda diğer objelerle çarpışma kontrolü
     *
     * @param {string} id         — Kontrol edilen objenin kimliği
     * @param {THREE.Vector3} newPos — Önerilen yeni pozisyon
     * @returns {{ collides: boolean, collidingWith: string|null }}
     */
    const checkCollision = useCallback(
        (id, newPos, newRotation = null, roomId = null, allowSurfaceContact = false) => {
            const entry = objectsRef.current.get(id);
            if (!entry || !entry.object) return { collides: false, collidingWith: null };

            // Objenin mevcut pozisyonunu kaydet
            const originalPos = entry.object.position.clone();
            const originalRotation = entry.object.rotation.y;

            // Geçici olarak yeni pozisyona taşı
            entry.object.position.copy(newPos);
            if (newRotation !== null) entry.object.rotation.y = newRotation;
            entry.object.updateMatrixWorld(true);

            // Bu objenin AABB'sini hesapla
            const boxA = computeWorldAABB(entry.object);

            // Diğer tüm objelerle kontrol et
            let result = { collides: false, collidingWith: null };

            for (const [otherId, otherEntry] of objectsRef.current.entries()) {
                if (otherId === id || !otherEntry.object) continue;

                const boxB = computeWorldAABB(otherEntry.object);

                if (boxA.intersectsBox(boxB)) {
                    result = { collides: true, collidingWith: otherId };
                    break;
                }
            }

            // Static furnishings are cached as individual boxes, rather than
            // one room-sized union, so valid open floor space remains usable.
            if (!result.collides && roomId) {
                const furnitureBoxes = staticRoomsRef.current.get(roomId) || [];
                const candidateBox = boxA.clone().expandByScalar(-0.01);
                for (let i = 0; i < furnitureBoxes.length; i++) {
                    // Tabletop devices may sit a few centimetres into a desk's
                    // visual top without being treated as an intersection.
                    if (allowSurfaceContact && candidateBox.min.y >= furnitureBoxes[i].max.y - 0.08) continue;
                    if (candidateBox.intersectsBox(furnitureBoxes[i])) {
                        result = { collides: true, collidingWith: `furniture:${roomId}:${i}` };
                        break;
                    }
                }
            }

            // Pozisyonu geri al
            entry.object.position.copy(originalPos);
            entry.object.rotation.y = originalRotation;
            entry.object.updateMatrixWorld(true);

            return result;
        },
        [computeWorldAABB]
    );

    /**
     * Duvar sınır kontrolü — objenin ait olduğu odanın sınırları içinde kalmasını sağlar
     *
     * @param {[number,number,number]} position — Obje pozisyonu [x, y, z]
     * @param {[number,number,number]} size     — Obje boyutları [w, h, d]
     * @param {{ size: {width, depth}, position: [x,y,z] }} room — Oda verisi
     */
    const checkWallCollision = useCallback((position, size, room) => {
        if (!room) return position;

        const [x, y, z] = position;
        const [w, , d] = size;
        const halfW = w / 2;
        const halfD = d / 2;
        const halfRoomW = room.size.width / 2;
        const halfRoomD = room.size.depth / 2;

        const roomX = room.position ? room.position[0] : 0;
        const roomZ = room.position ? room.position[2] : 0;

        const wallThickness = 0.1;
        const minX = roomX - halfRoomW + halfW + wallThickness;
        const maxX = roomX + halfRoomW - halfW - wallThickness;
        const minZ = roomZ - halfRoomD + halfD + wallThickness;
        const maxZ = roomZ + halfRoomD - halfD - wallThickness;

        return [
            Math.max(minX, Math.min(maxX, x)),
            y,
            Math.max(minZ, Math.min(maxZ, z)),
        ];
    }, []);

    return {
        register,
        unregister,
        registerStaticBoxes,
        unregisterStaticRoom,
        checkCollision,
        checkWallCollision,
    };
};

export default useCollision;

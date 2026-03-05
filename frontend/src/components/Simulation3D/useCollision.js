import { useRef, useCallback, useMemo } from 'react';
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

    /**
     * Belirli bir objenin yeni pozisyonunda diğer objelerle çarpışma kontrolü
     *
     * @param {string} id         — Kontrol edilen objenin kimliği
     * @param {THREE.Vector3} newPos — Önerilen yeni pozisyon
     * @returns {{ collides: boolean, collidingWith: string|null }}
     */
    const checkCollision = useCallback(
        (id, newPos) => {
            const entry = objectsRef.current.get(id);
            if (!entry || !entry.object) return { collides: false, collidingWith: null };

            // Objenin mevcut pozisyonunu kaydet
            const originalPos = entry.object.position.clone();

            // Geçici olarak yeni pozisyona taşı
            entry.object.position.copy(newPos);
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

            // Pozisyonu geri al
            entry.object.position.copy(originalPos);
            entry.object.updateMatrixWorld(true);

            return result;
        },
        [computeWorldAABB]
    );

    /**
     * Duvar sınır kontrolü — objenin oda sınırları içinde kalmasını sağlar
     *
     * @param {[number,number,number]} position — Obje pozisyonu [x, y, z]
     * @param {[number,number,number]} size     — Obje boyutları [w, h, d]
     * @param {{ width: number, depth: number }} room — Oda boyutları
     * @returns {[number, number, number]} — Sınırlandırılmış pozisyon
     */
    const checkWallCollision = useCallback((position, size, room) => {
        const [x, y, z] = position;
        const [w, , d] = size; // genişlik ve derinlik (yükseklik Y için önemsiz)
        const halfW = w / 2;
        const halfD = d / 2;
        const halfRoomW = room.width / 2;
        const halfRoomD = room.depth / 2;

        // Duvar sınırları (duvar kalınlığı 0.1 metre)
        const wallThickness = 0.1;
        const minX = -halfRoomW + halfW + wallThickness;
        const maxX = halfRoomW - halfW - wallThickness;
        const minZ = -halfRoomD + halfD + wallThickness;
        const maxZ = halfRoomD - halfD - wallThickness;

        return [
            Math.max(minX, Math.min(maxX, x)),
            y,
            Math.max(minZ, Math.min(maxZ, z)),
        ];
    }, []);

    return { register, unregister, checkCollision, checkWallCollision };
};

export default useCollision;

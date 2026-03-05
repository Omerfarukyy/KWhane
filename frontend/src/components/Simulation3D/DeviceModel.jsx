import { useEffect, useRef, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/**
 * DeviceModel.jsx — GLTF/GLB Model Yükleyici
 *
 * Dışarıdan import edilecek gerçek cihaz modellerini
 * (buzdolabı, çamaşır makinesi vb.) useGLTF ile yükler.
 *
 * Özellikler:
 *  - GLTF/GLB dosyasını yükler ve sahneye ekler
 *  - Bounding Box hesaplar ve collision sistemine kaydeder
 *  - Gerçek dünya ölçeğine (1 birim = 1 metre) uyarlar
 *  - Gölge desteği (castShadow / receiveShadow)
 *
 * Props:
 *  - url         : GLTF/GLB dosya yolu veya URL'si
 *  - scale       : Ölçek [x, y, z] (varsayılan: [1,1,1])
 *  - rotation    : Rotasyon [x, y, z] radyan (varsayılan: [0,0,0])
 *  - name        : Obje tanımlayıcı isim (collision kaydı için)
 *  - onLoaded    : Model yüklendiğinde çağrılır, { boundingBox, size } döner
 *  - collisionRef: useCollision hook'undan gelen register/unregister referansı
 *
 * Kullanım:
 *  <DeviceModel
 *    url="/models/fridge.glb"
 *    scale={[1, 1, 1]}
 *    name="fridge-1"
 *    onLoaded={({ boundingBox, size }) => console.log(size)}
 *  />
 */
const DeviceModel = ({
    url,
    scale = [1, 1, 1],
    rotation = [0, 0, 0],
    name = 'device',
    onLoaded,
    collisionRef,
}) => {
    const { scene } = useGLTF(url);
    const groupRef = useRef();

    /**
     * Model yüklendikten sonra:
     * 1. Tüm mesh'lere gölge ayarları uygula
     * 2. Bounding Box hesapla
     * 3. Collision sistemine kaydet
     * 4. onLoaded callback'ini çağır
     */
    useEffect(() => {
        if (!scene) return;

        // Tüm mesh'lere gölge desteği ekle
        scene.traverse((child) => {
            if (child.isMesh) {
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });

        // Bounding Box hesapla
        const box = new THREE.Box3().setFromObject(scene);
        const size = new THREE.Vector3();
        box.getSize(size);

        // Collision sistemine kaydet
        if (collisionRef && groupRef.current) {
            collisionRef.register(name, groupRef.current);
        }

        // Model bilgisini dışarıya bildir
        if (onLoaded) {
            onLoaded({
                boundingBox: box,
                size: { x: size.x, y: size.y, z: size.z },
            });
        }

        // Cleanup: unmount olduğunda collision kaydını sil
        return () => {
            if (collisionRef) {
                collisionRef.unregister(name);
            }
        };
    }, [scene, name, collisionRef, onLoaded]);

    /**
     * Model sahnesini klonla — aynı modeli birden fazla
     * kez kullanmak için her instance'a ayrı kopya gerekir.
     */
    const clonedScene = useMemo(() => scene.clone(), [scene]);

    return (
        <group ref={groupRef} name={name} scale={scale} rotation={rotation}>
            <primitive object={clonedScene} />
        </group>
    );
};

/**
 * GLTF dosyalarını önceden yüklemek (preload) için yardımcı.
 * Uygulama başlangıcında çağrılabilir:
 *   DeviceModel.preload('/models/fridge.glb');
 */
DeviceModel.preload = (url) => {
    useGLTF.preload(url);
};

export default DeviceModel;

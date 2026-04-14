import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';

/**
 * Lights.jsx — Sahne Aydınlatması
 *
 * AmbientLight  : Genel ortam ışığı, gölgesiz dolgu sağlar.
 * DirectionalLight : Güneş benzeri yönlü ışık, gölge oluşturur.
 *
 * Shadow-map çözünürlüğü 1024×1024 olarak ayarlanmıştır.
 * Yönlü ışığın shadow-camera sınırları oda boyutlarına göre
 * genişletilebilir; varsayılan olarak ±10 birim (metre) kapsar.
 */
const Lights = () => {
    const dirLightRef = useRef();
    const { camera } = useThree();

    useFrame(() => {
        if (dirLightRef.current) {
            // Işık kameranın hemen üstünde-arkasında kalsın, böylece gölgeler bakış açısına göre değişir
            dirLightRef.current.position.set(
                camera.position.x + 2,
                camera.position.y + 10,
                camera.position.z + 2
            );
        }
    });

    return (
        <>
            {/* Ortam ışığı — her yüzeye eşit aydınlatma */}
            <ambientLight intensity={0.6} />

            {/* Yönlü ışık — gölge destekli, dinamik konumlandırma */}
            <directionalLight
                ref={dirLightRef}
                intensity={1.0}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-near={0.5}
                shadow-camera-far={100}
                shadow-camera-left={-20}
                shadow-camera-right={20}
                shadow-camera-top={20}
                shadow-camera-bottom={-20}
            />
        </>
    );
};

export default Lights;

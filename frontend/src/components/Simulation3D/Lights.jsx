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
    return (
        <>
            {/* Ortam ışığı — her yüzeye eşit aydınlatma */}
            <ambientLight intensity={0.6} />

            {/* Yönlü ışık — gölge destekli, tepeden-sağdan aydınlatma */}
            <directionalLight
                position={[8, 12, 8]}
                intensity={1.0}
                castShadow
                shadow-mapSize-width={1024}
                shadow-mapSize-height={1024}
                shadow-camera-near={0.5}
                shadow-camera-far={50}
                shadow-camera-left={-10}
                shadow-camera-right={10}
                shadow-camera-top={10}
                shadow-camera-bottom={-10}
            />
        </>
    );
};

export default Lights;

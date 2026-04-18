/**
 * Lights.jsx — Sahne Aydınlatması
 *
 * HemisphereLight : Gökten mavi, yerden çim yeşili dolgu — sahneye dış mekân hissi verir.
 * AmbientLight    : Genel dolgu (hemisphere olduğu için düşük tutuldu).
 * DirectionalLight: Sabit konumlu sıcak güneş. Sky bileşenindeki sunPosition ile aynı yönde.
 *
 * Güneş kameradan bağımsız statik tutuluyor — gölge yönü tutarlı kalır (daha gerçekçi).
 */
const SUN_POSITION = [40, 50, 25];

const Lights = () => (
    <>
        <hemisphereLight args={['#b8d9ff', '#4a6b3a', 0.55]} />

        <ambientLight intensity={0.25} />

        <directionalLight
            position={SUN_POSITION}
            intensity={1.4}
            color="#fff2d6"
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-near={0.5}
            shadow-camera-far={150}
            shadow-camera-left={-40}
            shadow-camera-right={40}
            shadow-camera-top={40}
            shadow-camera-bottom={-40}
            shadow-bias={-0.0005}
        />
    </>
);

export { SUN_POSITION };
export default Lights;

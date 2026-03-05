import { OrbitControls } from '@react-three/drei';
import useSceneStore from '../../store/useSceneStore';

/**
 * CameraControls.jsx — Kamera Kontrol Bileşeni
 *
 * Drei'nin OrbitControls'unu sarar ve oda simülasyonuna
 * uygun pan / zoom / rotation limitleri uygular.
 *
 * Limitler:
 *  - Polar açı: 10°–80° → kamera zeminin altına veya tam tepesine gidemez
 *  - Mesafe: 2–30 metre → çok yakın veya çok uzak zoom engellenir
 *  - Pan: etkin ama sınırlı (target sınırları)
 *  - Sağ tık ile pan, sol tık ile orbit (varsayılan davranış)
 *
 * Props:
 *  - maxDistance : Maksimum zoom-out mesafesi (varsayılan: 25)
 *  - minDistance : Minimum zoom-in mesafesi (varsayılan: 2)
 */
const CameraControls = ({ maxDistance = 25, minDistance = 2 }) => {
    const isDragging = useSceneStore((state) => state.isDragging);

    return (
        <OrbitControls
            // Sürükleme kilidi
            enabled={!isDragging}

            // Orbit ayarları
            enableDamping
            dampingFactor={0.08}

            // Polar açı limitleri (dikey dönüş)
            // Minimum ~10° (tam tepeden engelle), Maksimum ~80° (zemin altı engelle)
            minPolarAngle={Math.PI / 18}
            maxPolarAngle={(Math.PI * 4) / 9}

            // Zoom (mesafe) limitleri
            minDistance={minDistance}
            maxDistance={maxDistance}

            // Pan ayarları — sağ tık ile pan
            enablePan
            panSpeed={0.8}

            // Scroll ile zoom hızı
            zoomSpeed={0.8}

            // Ekranın ortasına kilitlenmesin, kullanıcı serbestçe dönsün
            makeDefault
        />
    );
};

export default CameraControls;

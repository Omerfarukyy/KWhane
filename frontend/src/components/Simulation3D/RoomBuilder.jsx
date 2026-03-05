import { useMemo } from 'react';
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
    const selectedId = useSceneStore((state) => state.selectedId);
    const setSelectedId = useSceneStore((state) => state.setSelectedId);

    const isSelected = selectedId === id;
    const wallMaterialProps = isSelected ? wallMatSelected : wallMatNormal;
    const floorMaterialProps = isSelected ? floorMatSelected : floorMatNormal;
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

    // Odaya tıklandığında seçimi (Selection) güncelle
    const handlePointerDown = (e) => {
        e.stopPropagation(); // Arkaya veya objeye tıklanmasını engelle
        setSelectedId(id);
    };

    return (
        <group name={`room-${id}`} position={position} onPointerDown={handlePointerDown}>
            {/* ─── Zemin ─────────────────────────────────────────── */}
            <mesh
                name="floor"
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0, 0]}
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

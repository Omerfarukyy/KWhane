import { useMemo } from 'react';
import { FurnitureInstances, FurnitureModel } from './FurnitureAsset';
import { FURNITURE_ASSETS } from './FurnitureRegistry';
import { buildFurnitureLayout } from './FurnitureLayouts';

const LightweightRug = ({ position, size, color }) => (
    <mesh position={position} receiveShadow raycast={() => null}>
        <boxGeometry args={[size[0], 0.024, size[1]]} />
        <meshStandardMaterial color={color} roughness={1} metalness={0} />
    </mesh>
);

const LightweightPlant = ({ position, scale = 1 }) => (
    <group position={position} scale={scale}>
        <mesh position={[0, 0.14, 0]} castShadow raycast={() => null}>
            <cylinderGeometry args={[0.13, 0.1, 0.28, 10]} />
            <meshStandardMaterial color="#9a6b43" roughness={0.82} />
        </mesh>
        {[[0, 0.42, 0], [-0.12, 0.36, 0.04], [0.12, 0.38, -0.03]].map((p, index) => (
            <mesh key={index} position={p} castShadow raycast={() => null}>
                <sphereGeometry args={[0.2, 9, 7]} />
                <meshStandardMaterial color={index === 0 ? '#52734c' : '#66885b'} roughness={0.9} />
            </mesh>
        ))}
    </group>
);

const RoomFurnishings = ({ roomType, width = 6, depth = 5, layout: providedLayout }) => {
    const layout = useMemo(
        () => providedLayout || buildFurnitureLayout(roomType, width, depth),
        [providedLayout, roomType, width, depth],
    );

    const batches = useMemo(() => {
        const repeatable = new Map();
        const singles = [];
        layout.items.forEach((entry) => {
            if (FURNITURE_ASSETS[entry.asset]?.repeatable) {
                if (!repeatable.has(entry.asset)) repeatable.set(entry.asset, []);
                repeatable.get(entry.asset).push(entry);
            } else {
                singles.push(entry);
            }
        });
        return { repeatable, singles };
    }, [layout]);

    return (
        <group>
            {batches.singles.map((entry) => (
                <FurnitureModel
                    key={entry.id}
                    assetKey={entry.asset}
                    position={entry.position}
                    rotation={entry.rotation}
                    scale={entry.scale}
                />
            ))}

            {[...batches.repeatable.entries()].map(([assetKey, entries]) => (
                entries.length > 1 ? (
                    <FurnitureInstances
                        key={assetKey}
                        assetKey={assetKey}
                        transforms={entries.map((entry) => ({
                            position: entry.position,
                            rotation: entry.rotation,
                            scale: entry.scale,
                        }))}
                    />
                ) : (
                    <FurnitureModel
                        key={entries[0].id}
                        assetKey={assetKey}
                        position={entries[0].position}
                        rotation={entries[0].rotation}
                        scale={entries[0].scale}
                    />
                )
            ))}

            {layout.surfaces.map((entry) => (
                <mesh key={entry.id} position={entry.position} castShadow receiveShadow raycast={() => null}>
                    <boxGeometry args={entry.size} />
                    <meshStandardMaterial color={entry.color} roughness={0.42} metalness={0.02} envMapIntensity={0.55} />
                </mesh>
            ))}

            {layout.decor.map((entry) => entry.type === 'rug' ? (
                <LightweightRug key={entry.id} {...entry} />
            ) : (
                <LightweightPlant key={entry.id} {...entry} />
            ))}
        </group>
    );
};

export default RoomFurnishings;

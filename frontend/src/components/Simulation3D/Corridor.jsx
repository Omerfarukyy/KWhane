import * as THREE from 'three';

const CORRIDOR_WIDTH = 1.5;
const WALL_H = 2.8;
const WALL_T = 0.1;

/**
 * Corridor — renders a floor + two sidewalls connecting two rooms
 * that are linked via the + buttons but are NOT touching.
 *
 * Props:
 *   fromRoom  — room object { position:[x,y,z], size:{width,depth,height} }
 *   toRoom    — room object
 *   fromWall  — 'right' | 'left' | 'front' | 'back'
 */
const Corridor = ({ fromRoom, toRoom, fromWall }) => {
    // Compute entrance points on each room wall face
    const fx = fromRoom.position[0];
    const fz = fromRoom.position[2];
    const tx = toRoom.position[0];
    const tz = toRoom.position[2];

    let startX, startZ, endX, endZ;

    switch (fromWall) {
        case 'right':
            startX = fx + fromRoom.size.width / 2;
            startZ = fz;
            endX   = tx - toRoom.size.width / 2;
            endZ   = tz;
            break;
        case 'left':
            startX = fx - fromRoom.size.width / 2;
            startZ = fz;
            endX   = tx + toRoom.size.width / 2;
            endZ   = tz;
            break;
        case 'front':
            startX = fx;
            startZ = fz + fromRoom.size.depth / 2;
            endX   = tx;
            endZ   = tz - toRoom.size.depth / 2;
            break;
        case 'back':
            startX = fx;
            startZ = fz - fromRoom.size.depth / 2;
            endX   = tx;
            endZ   = tz + toRoom.size.depth / 2;
            break;
        default:
            return null;
    }

    const dx = endX - startX;
    const dz = endZ - startZ;
    const length = Math.sqrt(dx * dx + dz * dz);
    if (length < 0.1) return null;

    const angle = Math.atan2(dx, dz); // rotation around Y to align with direction
    const midX  = (startX + endX) / 2;
    const midZ  = (startZ + endZ) / 2;

    const floorMat  = { color: '#b0b8c8', transparent: true, opacity: 0.55, side: THREE.DoubleSide };
    const wallMat   = { color: '#8ecae6', transparent: true, opacity: 0.25, side: THREE.DoubleSide };

    return (
        <group position={[midX, 0, midZ]} rotation={[0, angle, 0]}>
            {/* Floor strip */}
            <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <planeGeometry args={[CORRIDOR_WIDTH, length]} />
                <meshStandardMaterial {...floorMat} />
            </mesh>

            {/* Left sidewall */}
            <mesh position={[-CORRIDOR_WIDTH / 2, WALL_H / 2, 0]}>
                <boxGeometry args={[WALL_T, WALL_H, length]} />
                <meshStandardMaterial {...wallMat} />
            </mesh>

            {/* Right sidewall */}
            <mesh position={[CORRIDOR_WIDTH / 2, WALL_H / 2, 0]}>
                <boxGeometry args={[WALL_T, WALL_H, length]} />
                <meshStandardMaterial {...wallMat} />
            </mesh>

            {/* Ceiling (subtle) */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, WALL_H, 0]}>
                <planeGeometry args={[CORRIDOR_WIDTH, length]} />
                <meshStandardMaterial color="#94a3b8" transparent opacity={0.15} side={THREE.DoubleSide} />
            </mesh>
        </group>
    );
};

export default Corridor;

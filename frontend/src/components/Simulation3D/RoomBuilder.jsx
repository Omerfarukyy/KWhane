import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import useSceneStore, { objectRefs } from '../../store/useSceneStore';
import RoomFurnishings from './RoomFurnishings';

const WALL_THICKNESS = 0.1;
const DIVIDER_THICKNESS = 0.04;
const wallMatNormal = { color: '#8ecae6', transparent: true, opacity: 0.35, side: 2 };
const wallMatSelected = { color: '#0ea5e9', transparent: true, opacity: 0.6, side: 2 };
const dividerMatNormal = { color: '#a8d8ea', transparent: true, opacity: 0.18, side: 2 };
const dividerMatSelected = { color: '#0ea5e9', transparent: true, opacity: 0.32, side: 2 };
const floorMatNormal = { color: '#e0e0e0', side: 2 };
const floorMatSelected = { color: '#cbd5e1', side: 2 };

// Helper Components for UI
const WallAddBtn = ({ position, onClick, rotation = [0, 0, 0] }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <mesh
            position={position}
            rotation={rotation}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(false); document.body.style.cursor = 'auto'; }}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
            <boxGeometry args={[0.6, 0.6, 0.6]} />
            <meshBasicMaterial color={hovered ? '#4ade80' : '#22c55e'} transparent opacity={0.8} />
            <Html center style={{ pointerEvents: 'none', color: 'white', fontWeight: 'bold', fontSize: '1.5rem', userSelect: 'none' }}>
                +
            </Html>
        </mesh>
    );
};

const ResizeHandle = ({ position, onDragStart, onDrag, onDragEnd }) => {
    const [hovered, setHovered] = useState(false);
    const { gl, raycaster, controls } = useThree();
    const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
    const intersection = useRef(new THREE.Vector3());
    const isDraggingHandle = useRef(false);

    const down = (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        e.stopPropagation();
        isDraggingHandle.current = true;
        if (controls) controls.enabled = false;
        gl.domElement.style.cursor = 'crosshair';
        (e.target ?? gl.domElement).setPointerCapture(e.pointerId);
        onDragStart();
    };

    const move = (e) => {
        if (!isDraggingHandle.current) return;
        e.stopPropagation();
        raycaster.ray.intersectPlane(dragPlane.current, intersection.current);
        onDrag(intersection.current.clone());
    };

    const up = (e) => {
        if (!isDraggingHandle.current) return;
        e.stopPropagation();
        isDraggingHandle.current = false;
        if (controls) controls.enabled = true;
        gl.domElement.style.cursor = hovered ? 'pointer' : 'auto';
        onDragEnd();
    };

    return (
        <mesh
            position={position}
            onPointerDown={down}
            onPointerMove={move}
            onPointerUp={up}
            onPointerOver={(e) => { e.stopPropagation(); setHovered(true); document.body.style.cursor = 'pointer'; }}
            onPointerOut={(e) => { e.stopPropagation(); setHovered(false); if (!isDraggingHandle.current) document.body.style.cursor = 'auto'; }}
        >
            <boxGeometry args={[0.5, 0.5, 0.5]} />
            <meshBasicMaterial color={hovered ? '#facc15' : '#eab308'} />
        </mesh>
    );
};


const RoomBuilder = ({ id, name = 'Oda', roomType = 'Genel', width = 5, depth = 4, height = 3, position = [0, 0, 0], adjacentSides = {} }) => {
    const groupRef = useRef();
    const [isDragging, setIsDragging] = useState(false);

    const selectedId        = useSceneStore((state) => state.selectedId);
    const setSelectedId     = useSceneStore((state) => state.setSelectedId);
    const setPinnedDeviceId = useSceneStore((state) => state.setPinnedDeviceId);
    const setIsDraggingStore = useSceneStore((state) => state.setIsDragging);
    const updateRoomPosition = useSceneStore((state) => state.updateRoomPosition);
    const rooms = useSceneStore((state) => state.rooms);

    const isCreationMode = useSceneStore((state) => state.isCreationMode);
    const setPendingRoomAttach = useSceneStore((state) => state.setPendingRoomAttach);
    const resizeRoom = useSceneStore((state) => state.resizeRoom);
    const moveRoomGhosts = useSceneStore((state) => state.moveRoomGhosts);

    const isSelected = selectedId === id;
    const wallMaterialProps = isSelected ? wallMatSelected : wallMatNormal;
    const dividerMaterialProps = isSelected ? dividerMatSelected : dividerMatNormal;
    const floorMaterialProps = isSelected ? floorMatSelected : floorMatNormal;

    const { gl, raycaster, controls } = useThree();

    const dragPlane = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), 0));
    const intersection = useRef(new THREE.Vector3());
    const offset = useRef(new THREE.Vector3());
    const lastValidPos = useRef(new THREE.Vector3(...position));
    const objectsInRoom = useRef([]);

    // Keep lastValidPos in sync with external position updates (like resizing)
    useEffect(() => {
        lastValidPos.current.set(position[0], position[1], position[2]);
    }, [position]);

    const walls = useMemo(() => {
        const halfW = width / 2;
        const halfD = depth / 2;
        const halfH = height / 2;
        const wt_half = WALL_THICKNESS / 2;

        return [
            { name: 'wall-back', position: [0, halfH, -halfD + wt_half], size: [width - WALL_THICKNESS * 2, height, WALL_THICKNESS] },
            { name: 'wall-front', position: [0, halfH, halfD - wt_half], size: [width - WALL_THICKNESS * 2, height, WALL_THICKNESS] },
            { name: 'wall-left', position: [-halfW + wt_half, halfH, 0], size: [WALL_THICKNESS, height, depth] },
            { name: 'wall-right', position: [halfW - wt_half, halfH, 0], size: [WALL_THICKNESS, height, depth] },
        ];
    }, [width, depth, height]);

    const checkRoomOverlap = useCallback((testX, testZ, overrideW = width, overrideD = depth) => {
        const halfW = overrideW / 2;
        const halfD = overrideD / 2;
        const minX1 = testX - halfW;
        const maxX1 = testX + halfW;
        const minZ1 = testZ - halfD;
        const maxZ1 = testZ + halfD;

        for (const other of rooms) {
            if (other.id === id) continue;
            const oHW = other.size.width / 2;
            const oHD = other.size.depth / 2;
            const minX2 = other.position[0] - oHW;
            const maxX2 = other.position[0] + oHW;
            const minZ2 = other.position[2] - oHD;
            const maxZ2 = other.position[2] + oHD;

            if (maxX1 - 0.01 > minX2 && minX1 + 0.01 < maxX2 && maxZ1 - 0.01 > minZ2 && minZ1 + 0.01 < maxZ2) {
                return true;
            }
        }
        return false;
    }, [rooms, id, width, depth]);

    const handlePointerDown = useCallback((e) => {
        if (!isCreationMode) return;
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (e.object.name !== 'floor') return;

        e.stopPropagation();
        if (controls) controls.enabled = false;
        setSelectedId(id);
        setPinnedDeviceId(null);
        setIsDragging(true);
        setIsDraggingStore(true);

        gl.domElement.style.cursor = 'grabbing';
        (e.target ?? gl.domElement).setPointerCapture(e.pointerId);

        raycaster.ray.intersectPlane(dragPlane.current, intersection.current);
        offset.current.copy(groupRef.current.position).sub(intersection.current);
        lastValidPos.current.copy(groupRef.current.position);

        objectsInRoom.current = [];
        const stateObjects = useSceneStore.getState().objects;
        const roomP = groupRef.current.position;
        const minX = roomP.x - width / 2;
        const maxX = roomP.x + width / 2;
        const minZ = roomP.z - depth / 2;
        const maxZ = roomP.z + depth / 2;

        stateObjects.forEach(obj => {
            const [ox, oy, oz] = obj.position;
            if (ox >= minX && ox <= maxX && oz >= minZ && oz <= maxZ) {
                objectsInRoom.current.push({
                    id: obj.id,
                    offsetX: ox - roomP.x,
                    offsetZ: oz - roomP.z,
                    y: oy
                });
            }
        });
    }, [isCreationMode, gl, raycaster, id, setSelectedId, setIsDraggingStore, controls, width, depth]);

    const handlePointerMove = useCallback((e) => {
        if (!isDragging) return;
        e.stopPropagation();

        raycaster.ray.intersectPlane(dragPlane.current, intersection.current);

        if (groupRef.current) {
            let newX = intersection.current.x + offset.current.x;
            let newZ = intersection.current.z + offset.current.z;

            if (checkRoomOverlap(newX, newZ)) {
                return;
            }

            groupRef.current.position.x = newX;
            groupRef.current.position.z = newZ;
            lastValidPos.current.set(newX, 0, newZ);

            objectsInRoom.current.forEach(item => {
                const oRef = objectRefs[item.id];
                if (oRef) {
                    oRef.position.x = newX + item.offsetX;
                    oRef.position.z = newZ + item.offsetZ;
                }
            });
        }
    }, [isDragging, raycaster, checkRoomOverlap]);

    const handlePointerUp = useCallback((e) => {
        if (!isDragging) return;
        e.stopPropagation();
        if (controls) controls.enabled = true;
        setIsDragging(false);
        setIsDraggingStore(false);

        gl.domElement.style.cursor = 'auto';

        if (groupRef.current) {
            let snappedX = Math.round(groupRef.current.position.x / 0.5) * 0.5;
            let snappedZ = Math.round(groupRef.current.position.z / 0.5) * 0.5;

            const updateObjPos = useSceneStore.getState().updateObjectPosition;

            if (checkRoomOverlap(snappedX, snappedZ)) {
                groupRef.current.position.copy(lastValidPos.current);
                objectsInRoom.current.forEach(item => {
                    const oRef = objectRefs[item.id];
                    if (oRef) {
                        oRef.position.x = lastValidPos.current.x + item.offsetX;
                        oRef.position.z = lastValidPos.current.z + item.offsetZ;
                    }
                });
            } else {
                groupRef.current.position.x = snappedX;
                groupRef.current.position.z = snappedZ;
                updateRoomPosition(id, [snappedX, 0, snappedZ]);

                // Shift ghost objects with the room
                const dx = snappedX - position[0];
                const dz = snappedZ - position[2];
                if (dx !== 0 || dz !== 0) moveRoomGhosts(id, dx, dz);

                objectsInRoom.current.forEach(item => {
                    const oRef = objectRefs[item.id];
                    if (oRef) {
                        const finalX = snappedX + item.offsetX;
                        const finalZ = snappedZ + item.offsetZ;
                        oRef.position.x = finalX;
                        oRef.position.z = finalZ;
                        updateObjPos(item.id, [finalX, item.y, finalZ]);
                    }
                });
            }
        }
    }, [isDragging, gl, checkRoomOverlap, updateRoomPosition, id, setIsDraggingStore, moveRoomGhosts, position]);

    const handleQuickAdd = (wall) => {
        setPendingRoomAttach({ parentId: id, wall });
    };

    // Resizing logic for corner handles
    const handleResizeDrag = useCallback((corner, worldPos) => {
        let newX = worldPos.x;
        let newZ = worldPos.z;

        const minW = 2;
        const minD = 2;

        const currentPos = lastValidPos.current;
        let newW = width;
        let newD = depth;
        let newCenter = new THREE.Vector3().copy(currentPos);

        if (corner === 'fr') { // Front Right
            const blX = currentPos.x - width / 2;
            const blZ = currentPos.z - depth / 2;
            newW = Math.max(minW, newX - blX);
            newD = Math.max(minD, newZ - blZ);
            newCenter.x = blX + newW / 2;
            newCenter.z = blZ + newD / 2;
        } else if (corner === 'fl') { // Front Left
            const brX = currentPos.x + width / 2;
            const brZ = currentPos.z - depth / 2;
            newW = Math.max(minW, brX - newX);
            newD = Math.max(minD, newZ - brZ);
            newCenter.x = brX - newW / 2;
            newCenter.z = brZ + newD / 2;
        } else if (corner === 'br') { // Back Right
            const flX = currentPos.x - width / 2;
            const flZ = currentPos.z + depth / 2;
            newW = Math.max(minW, newX - flX);
            newD = Math.max(minD, flZ - newZ);
            newCenter.x = flX + newW / 2;
            newCenter.z = flZ - newD / 2;
        } else if (corner === 'bl') { // Back Left
            const frX = currentPos.x + width / 2;
            const frZ = currentPos.z + depth / 2;
            newW = Math.max(minW, frX - newX);
            newD = Math.max(minD, frZ - newZ);
            newCenter.x = frX - newW / 2;
            newCenter.z = frZ - newD / 2;
        }

        newW = Math.round(newW / 0.5) * 0.5;
        newD = Math.round(newD / 0.5) * 0.5;
        newCenter.x = Math.round(newCenter.x / 0.5) * 0.5;
        newCenter.z = Math.round(newCenter.z / 0.5) * 0.5;

        // Optionally only allow resize if no overlap!
        if (!checkRoomOverlap(newCenter.x, newCenter.z, newW, newD)) {
            resizeRoom(id, { width: newW, depth: newD, height }, [newCenter.x, 0, newCenter.z]);
        }
    }, [id, width, depth, height, resizeRoom, checkRoomOverlap]);

    return (
        <group
            ref={groupRef}
            name={`room-${id}`}
            position={position}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerOver={(e) => {
                if (!isDragging && e.object.name === 'floor' && isCreationMode) gl.domElement.style.cursor = 'grab';
            }}
            onPointerOut={(e) => {
                if (!isDragging) gl.domElement.style.cursor = 'auto';
            }}
            onClick={(e) => {
                if (e.pointerType === 'mouse' && e.button !== 0) return;
                if (e.object.name === 'floor' || e.object.name.startsWith('wall')) {
                    e.stopPropagation();
                    if (isCreationMode) { setSelectedId(id); setPinnedDeviceId(null); }
                }
            }}
        >
            <mesh name="floor" rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]} receiveShadow>
                <planeGeometry args={[width, depth]} />
                <meshStandardMaterial {...floorMaterialProps} />
            </mesh>

            {walls.map((wall) => {
                const sideKey = wall.name.replace('wall-', ''); // 'back','front','left','right'
                const neighborId = adjacentSides[sideKey];

                // Bitişik komşu varsa: ince saydam bölme duvar (her iki oda da çizmesin diye id kıyaslamasıyla tek seferde)
                if (neighborId) {
                    if (String(id) > String(neighborId)) return null;
                    const isLR = sideKey === 'left' || sideKey === 'right';
                    const dividerSize = isLR
                        ? [DIVIDER_THICKNESS, wall.size[1], wall.size[2]]
                        : [wall.size[0], wall.size[1], DIVIDER_THICKNESS];
                    return (
                        <mesh key={wall.name} name={wall.name} position={wall.position} receiveShadow>
                            <boxGeometry args={dividerSize} />
                            <meshStandardMaterial {...dividerMaterialProps} />
                        </mesh>
                    );
                }

                return (
                    <mesh key={wall.name} name={wall.name} position={wall.position} castShadow receiveShadow>
                        <boxGeometry args={wall.size} />
                        <meshStandardMaterial {...wallMaterialProps} />
                    </mesh>
                );
            })}

            {/* Static decorative furniture for this room type */}
            <RoomFurnishings roomType={roomType} width={width} depth={depth} height={height} />

            {/* Yüzen Oda Adı */}
            <Html
                position={[0, height + 0.5, 0]}
                center
                style={{
                    color: 'white',
                    fontWeight: 'bold',
                    fontSize: '1rem',
                    pointerEvents: 'none',
                    userSelect: 'none',
                    textShadow: '1px 1px 2px black, -1px -1px 2px black, 1px -1px 2px black, -1px 1px 2px black'
                }}
            >
                {name}
            </Html>

            {/* Hızlı Ekleme ve Yeniden Boyutlandırma Kontrolleri */}
            {isCreationMode && isSelected && !isDragging && (
                <group>
                    {/* Hızlı Duvar Butonları */}
                    <WallAddBtn position={[0, height / 2, depth / 2 + 0.4]} onClick={() => handleQuickAdd('front')} />
                    <WallAddBtn position={[0, height / 2, -depth / 2 - 0.4]} onClick={() => handleQuickAdd('back')} />
                    <WallAddBtn position={[width / 2 + 0.4, height / 2, 0]} onClick={() => handleQuickAdd('right')} />
                    <WallAddBtn position={[-width / 2 - 0.4, height / 2, 0]} onClick={() => handleQuickAdd('left')} />

                    {/* Köşe Boyutlandırma Tutamaçları */}
                    {/* Yüksekliği height/2 veya 0.25 yaparak biraz yukarıda olmasını sağla */}
                    <ResizeHandle position={[width / 2, 0.25, depth / 2]} onDragStart={() => { }} onDrag={(pos) => handleResizeDrag('fr', pos)} onDragEnd={() => { }} />
                    <ResizeHandle position={[-width / 2, 0.25, depth / 2]} onDragStart={() => { }} onDrag={(pos) => handleResizeDrag('fl', pos)} onDragEnd={() => { }} />
                    <ResizeHandle position={[width / 2, 0.25, -depth / 2]} onDragStart={() => { }} onDrag={(pos) => handleResizeDrag('br', pos)} onDragEnd={() => { }} />
                    <ResizeHandle position={[-width / 2, 0.25, -depth / 2]} onDragStart={() => { }} onDrag={(pos) => handleResizeDrag('bl', pos)} onDragEnd={() => { }} />
                </group>
            )}
        </group>
    );
};

export default RoomBuilder;

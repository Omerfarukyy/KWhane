import { useMemo, useRef, useState, useCallback, useEffect } from 'react';
import React from 'react';
import { useThree } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';
import useSceneStore, { objectRefs } from '../../store/useSceneStore';
import RoomFurnishings from './RoomFurnishings';

const WALL_THICKNESS = 0.1;
const DIVIDER_THICKNESS = 0.04;
const wallMatNormal = {
    color: '#93c5fd', transparent: true, opacity: 0.28,
    roughness: 0.4, metalness: 0.05,
    side: THREE.DoubleSide, depthWrite: false,
};
const wallMatSelected = {
    color: '#3b82f6', transparent: true, opacity: 0.45,
    roughness: 0.3, metalness: 0.1,
    emissive: '#3b82f6', emissiveIntensity: 0.15,
    side: THREE.DoubleSide, depthWrite: false,
};
const dividerMatNormal = {
    color: '#bfdbfe', transparent: true, opacity: 0.14,
    roughness: 0.5, metalness: 0,
    side: THREE.DoubleSide, depthWrite: false,
};
const dividerMatSelected = {
    color: '#3b82f6', transparent: true, opacity: 0.25,
    roughness: 0.4, metalness: 0.05,
    side: THREE.DoubleSide, depthWrite: false,
};
const floorMatNormal = { color: '#e5e7eb', roughness: 0.8, metalness: 0, side: THREE.DoubleSide };
const floorMatSelected = { color: '#cbd5e1', roughness: 0.7, metalness: 0, side: THREE.DoubleSide };

// Helper Components for UI
const WallAddBtn = ({ position, onClick }) => {
    const [hovered, setHovered] = useState(false);
    return (
        <Html position={position} center style={{ pointerEvents: 'none' }}>
            <button
                style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: hovered ? '#4ade80' : '#22c55e',
                    border: 'none',
                    color: 'white',
                    fontSize: '1.35rem',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    pointerEvents: 'auto',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    lineHeight: 1,
                    paddingBottom: 2,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                    userSelect: 'none',
                }}
                onMouseEnter={() => setHovered(true)}
                onMouseLeave={() => setHovered(false)}
                onClick={(e) => { e.stopPropagation(); onClick(); }}
            >
                +
            </button>
        </Html>
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


// Wraps a subtree and disables raycasting on every descendant mesh, so the
// children render visually but never intercept pointer events. Used to keep
// decorative meshes (room furniture) from blocking clicks on devices behind
// them.
const NonRaycastable = ({ children }) => {
    const ref = useRef();
    useEffect(() => {
        const root = ref.current;
        if (!root) return;
        root.traverse((child) => {
            if (child.isMesh) child.raycast = () => null;
        });
    });
    return <group ref={ref}>{children}</group>;
};

// Interpolates green→yellow→red based on t ∈ [0,1]
function heatColor(t) {
    const c = new THREE.Color();
    if (t < 0.5) {
        c.lerpColors(new THREE.Color('#22c55e'), new THREE.Color('#f59e0b'), t * 2);
    } else {
        c.lerpColors(new THREE.Color('#f59e0b'), new THREE.Color('#ef4444'), (t - 0.5) * 2);
    }
    return c;
}

const RoomBuilder = ({ id, name = 'Oda', roomType = 'Genel', width = 5, depth = 4, height = 3, position = [0, 0, 0], adjacentSides = {}, heatLevel = 0 }) => {
    const groupRef = useRef();
    const [isDragging, setIsDragging] = useState(false);

    const isSelected        = useSceneStore(useCallback((s) => s.selectedId === id, [id]));
    const setSelectedId     = useSceneStore((state) => state.setSelectedId);
    const setPinnedDeviceId = useSceneStore((state) => state.setPinnedDeviceId);
    const setIsDraggingStore = useSceneStore((state) => state.setIsDragging);
    const updateRoomPosition = useSceneStore((state) => state.updateRoomPosition);
    const rooms = useSceneStore((state) => state.rooms);

    const isCreationMode = useSceneStore((state) => state.isCreationMode);
    const setPendingRoomAttach = useSceneStore((state) => state.setPendingRoomAttach);
    const resizeRoom = useSceneStore((state) => state.resizeRoom);
    const moveRoomGhosts = useSceneStore((state) => state.moveRoomGhosts);
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

            {/* ── Enerji ısı haritası overlay ── */}
            {heatLevel > 0 && (
                <>
                    {/* Zemin renk tonu */}
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.013, 0]} renderOrder={1}>
                        <planeGeometry args={[width - 0.12, depth - 0.12]} />
                        <meshBasicMaterial
                            color={heatColor(heatLevel)}
                            transparent
                            opacity={0.08 + heatLevel * 0.18}
                            depthWrite={false}
                        />
                    </mesh>
                    {/* Renkli zemin ışığı */}
                    <pointLight
                        position={[0, 0.4, 0]}
                        color={heatColor(heatLevel)}
                        intensity={heatLevel * 6}
                        distance={Math.max(width, depth) * 1.2}
                        decay={2}
                    />
                </>
            )}

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
                        <mesh key={wall.name} name={wall.name} position={wall.position} receiveShadow raycast={() => null}>
                            <boxGeometry args={dividerSize} />
                            <meshStandardMaterial {...dividerMaterialProps} />
                        </mesh>
                    );
                }

                return (
                    <mesh key={wall.name} name={wall.name} position={wall.position} receiveShadow raycast={() => null}>
                        <boxGeometry args={wall.size} />
                        <meshStandardMaterial {...wallMaterialProps} />
                    </mesh>
                );
            })}

            {/* Static decorative furniture — non-interactive so raycasts pass
                through to the devices placed inside the room. */}
            <NonRaycastable>
                <RoomFurnishings roomType={roomType} width={width} depth={depth} height={height} />
            </NonRaycastable>

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
                    {/* Hızlı Duvar Butonları — komşu duvarlarda gizlenir */}
                    {!adjacentSides.front && (
                        <WallAddBtn position={[0, height / 2, depth / 2 + 0.4]} onClick={() => handleQuickAdd('front')} />
                    )}
                    {!adjacentSides.back && (
                        <WallAddBtn position={[0, height / 2, -depth / 2 - 0.4]} onClick={() => handleQuickAdd('back')} />
                    )}
                    {!adjacentSides.right && (
                        <WallAddBtn position={[width / 2 + 0.4, height / 2, 0]} onClick={() => handleQuickAdd('right')} />
                    )}
                    {!adjacentSides.left && (
                        <WallAddBtn position={[-width / 2 - 0.4, height / 2, 0]} onClick={() => handleQuickAdd('left')} />
                    )}

                    {/* Köşe Boyutlandırma Tutamaçları — köşeyi paylaşan iki duvarın
                        ikisi de komşuysa gizle (köşe başka odanın içinde kalır) */}
                    {!(adjacentSides.front && adjacentSides.right) && (
                        <ResizeHandle position={[width / 2, 0.25, depth / 2]} onDragStart={() => { }} onDrag={(pos) => handleResizeDrag('fr', pos)} onDragEnd={() => { }} />
                    )}
                    {!(adjacentSides.front && adjacentSides.left) && (
                        <ResizeHandle position={[-width / 2, 0.25, depth / 2]} onDragStart={() => { }} onDrag={(pos) => handleResizeDrag('fl', pos)} onDragEnd={() => { }} />
                    )}
                    {!(adjacentSides.back && adjacentSides.right) && (
                        <ResizeHandle position={[width / 2, 0.25, -depth / 2]} onDragStart={() => { }} onDrag={(pos) => handleResizeDrag('br', pos)} onDragEnd={() => { }} />
                    )}
                    {!(adjacentSides.back && adjacentSides.left) && (
                        <ResizeHandle position={[-width / 2, 0.25, -depth / 2]} onDragStart={() => { }} onDrag={(pos) => handleResizeDrag('bl', pos)} onDragEnd={() => { }} />
                    )}
                </group>
            )}
        </group>
    );
};

export default RoomBuilder;

/**
 * ElectricWiring — Ağaç topolojisi ile kablo tesisatı.
 *
 * Her odada cihazlar ince dal kablolar ile oda kavşak kutusuna bağlanır.
 * Kavşak kutusundan tek bir trunk kablo BFS ile sigorta kutusuna ulaşır.
 * Hub odasındaki / izole odadaki cihazlar doğrudan hub'a bağlanır.
 *
 * Görsel:
 *   dal kablo  — ince (r=0.007), cihaz renk kodlu
 *   trunk kablo — kalın (r=0.013), oda ortalama gücüne göre renk
 *   kavşak kutusu — küçük plastik kutu, çıkış duvarı üzerinde
 */

import { useMemo, useRef, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import useSceneStore from '../../store/useSceneStore';
import { CABLE_Y } from './ElectricHub';

const CABLE_RADIUS_BRANCH = 0.007;
const CABLE_RADIUS_TRUNK  = 0.013;
const SEGS_PER_POINT  = 8;
const RADIAL_SEGS     = 6;
const CATMULL_TENSION = 0.12;
const DOOR_THRESHOLD  = 0.45;
const WALL_INSET      = 0.06;

// ─── Oda konumlarından bağlantı listesini türet ───────────────────────────────
function deriveRoomLinks(rooms) {
    const links = [];
    const OPPOSITE = { right: 'left', left: 'right', front: 'back', back: 'front' };
    for (let i = 0; i < rooms.length; i++) {
        for (let j = i + 1; j < rooms.length; j++) {
            const a = rooms[i], b = rooms[j];
            const [ax, , az] = a.position;
            const [bx, , bz] = b.position;
            const aR = ax + a.size.width / 2,  aL = ax - a.size.width / 2;
            const bR = bx + b.size.width / 2,  bL = bx - b.size.width / 2;
            const aF = az + a.size.depth / 2,  aBk = az - a.size.depth / 2;
            const bF = bz + b.size.depth / 2,  bBk = bz - b.size.depth / 2;
            const xOv = Math.min(aR, bR) - Math.max(aL, bL);
            const zOv = Math.min(aF, bF) - Math.max(aBk, bBk);
            let fromWall = null;
            if      (Math.abs(aR  - bL)  < DOOR_THRESHOLD && zOv > 0.4) fromWall = 'right';
            else if (Math.abs(aL  - bR)  < DOOR_THRESHOLD && zOv > 0.4) fromWall = 'left';
            else if (Math.abs(aF  - bBk) < DOOR_THRESHOLD && xOv > 0.4) fromWall = 'front';
            else if (Math.abs(aBk - bF)  < DOOR_THRESHOLD && xOv > 0.4) fromWall = 'back';
            if (fromWall) links.push({ fromId: a.id, toId: b.id, fromWall, toWall: OPPOSITE[fromWall] });
        }
    }
    return links;
}

// ─── BFS: oda grafiğinde en kısa yol ─────────────────────────────────────────
function bfsRoomPath(startId, endId, roomLinks) {
    if (startId === endId) return [startId];
    const queue = [[startId]];
    const visited = new Set([startId]);
    while (queue.length) {
        const path = queue.shift();
        const curr = path[path.length - 1];
        const neighbors = roomLinks
            .filter(l => l.fromId === curr || l.toId === curr)
            .map(l => l.fromId === curr ? l.toId : l.fromId);
        for (const nb of neighbors) {
            if (visited.has(nb)) continue;
            const np = [...path, nb];
            if (nb === endId) return np;
            visited.add(nb);
            queue.push(np);
        }
    }
    return null;
}

// ─── Hub'ın hangi duvara yakın olduğunu belirle ───────────────────────────────
function getExitWallForHub(hubRoom, hubConnect) {
    const [rx, , rz] = hubRoom.position;
    const hw = hubRoom.size.width / 2;
    const hd = hubRoom.size.depth / 2;
    const dRight = Math.abs(hubConnect.x - (rx + hw));
    const dLeft  = Math.abs(hubConnect.x - (rx - hw));
    const dFront = Math.abs(hubConnect.z - (rz + hd));
    const dBack  = Math.abs(hubConnect.z - (rz - hd));
    const min = Math.min(dRight, dLeft, dFront, dBack);
    if (min === dRight) return 'right';
    if (min === dLeft)  return 'left';
    if (min === dFront) return 'front';
    return 'back';
}

// ─── Tek oda içi baseboard rotası ────────────────────────────────────────────
function baseboardRoute(from, room, exitWall) {
    const [rx, , rz] = room.position;
    const { width, depth } = room.size;
    const topZ   = rz - depth / 2 + WALL_INSET;
    const botZ   = rz + depth / 2 - WALL_INSET;
    const leftX  = rx - width / 2 + WALL_INSET;
    const rightX = rx + width / 2 - WALL_INSET;
    const fx = Math.max(leftX, Math.min(rightX, from.x));
    const fz = Math.max(topZ,  Math.min(botZ,   from.z));
    const pts = [];
    switch (exitWall) {
        case 'left':
        case 'right': {
            const exitX = exitWall === 'left' ? leftX : rightX;
            const nearZ = Math.abs(fz - topZ) <= Math.abs(fz - botZ) ? topZ : botZ;
            pts.push(new THREE.Vector3(fx,    CABLE_Y, nearZ));
            pts.push(new THREE.Vector3(exitX, CABLE_Y, nearZ));
            pts.push(new THREE.Vector3(exitX, CABLE_Y, rz));
            break;
        }
        case 'front':
        case 'back': {
            const exitZ = exitWall === 'front' ? botZ : topZ;
            const nearX = Math.abs(fx - leftX) <= Math.abs(fx - rightX) ? leftX : rightX;
            pts.push(new THREE.Vector3(nearX, CABLE_Y, fz));
            pts.push(new THREE.Vector3(nearX, CABLE_Y, exitZ));
            pts.push(new THREE.Vector3(rx,    CABLE_Y, exitZ));
            break;
        }
    }
    return pts;
}

// ─── Çok yakın noktaları temizle ─────────────────────────────────────────────
function dedup(pts, minDist = 0.025) {
    if (!pts.length) return pts;
    const out = [pts[0]];
    for (let i = 1; i < pts.length; i++) {
        if (pts[i].distanceTo(out[out.length - 1]) >= minDist) out.push(pts[i]);
    }
    return out;
}

// ─── Tam rota (cihaz → hub, doğrudan bağlantı) ───────────────────────────────
function buildWaypoints(device, rooms, roomLinks, hubRoomId, hubConnect) {
    const deviceRoom = rooms.find(r => r.id === device.roomId);
    const hubRoom    = rooms.find(r => r.id === hubRoomId);
    if (!deviceRoom || !hubRoom) return [];

    const deviceY = device.position[1] ?? 0;
    const startXZ = new THREE.Vector3(device.position[0], CABLE_Y, device.position[2]);
    const startPts = deviceY > CABLE_Y + 0.2
        ? [new THREE.Vector3(device.position[0], deviceY, device.position[2]), startXZ]
        : [startXZ];

    const hubExitWall = getExitWallForHub(hubRoom, hubConnect);

    if (deviceRoom.id === hubRoom.id) {
        const pts = baseboardRoute(startXZ, hubRoom, hubExitWall);
        return [...startPts, ...pts, hubConnect.clone()];
    }

    const roomPath = bfsRoomPath(deviceRoom.id, hubRoom.id, roomLinks);
    if (!roomPath) return [...startPts, hubConnect.clone()];

    const waypoints = [...startPts];
    let cur = startXZ.clone();

    for (let i = 0; i < roomPath.length - 1; i++) {
        const currId   = roomPath[i];
        const nextId   = roomPath[i + 1];
        const currRoom = rooms.find(r => r.id === currId);
        if (!currRoom) continue;
        const link = roomLinks.find(l =>
            (l.fromId === currId && l.toId === nextId) ||
            (l.toId   === currId && l.fromId === nextId)
        );
        if (!link) continue;
        const exitWall = link.fromId === currId ? link.fromWall : link.toWall;
        const pts = baseboardRoute(cur, currRoom, exitWall);
        waypoints.push(...pts);
        cur = pts[pts.length - 1].clone();
    }

    const pts = baseboardRoute(cur, hubRoom, hubExitWall);
    waypoints.push(...pts);
    waypoints.push(hubConnect.clone());
    return waypoints;
}

// ─── Oda kavşak noktası: hub yönündeki çıkış duvarı merkezi ──────────────────
function getRoomJunction(room, roomLinks, hubRoomId) {
    const roomPath = bfsRoomPath(room.id, hubRoomId, roomLinks);
    if (!roomPath || roomPath.length < 2) return null;

    const nextRoomId = roomPath[1];
    const link = roomLinks.find(l =>
        (l.fromId === room.id && l.toId === nextRoomId) ||
        (l.toId   === room.id && l.fromId === nextRoomId)
    );
    if (!link) return null;

    const exitWall = link.fromId === room.id ? link.fromWall : link.toWall;
    const [rx, , rz] = room.position;
    const { width, depth } = room.size;

    switch (exitWall) {
        case 'right': return new THREE.Vector3(rx + width / 2 - WALL_INSET, CABLE_Y, rz);
        case 'left':  return new THREE.Vector3(rx - width / 2 + WALL_INSET, CABLE_Y, rz);
        case 'front': return new THREE.Vector3(rx, CABLE_Y, rz + depth / 2 - WALL_INSET);
        case 'back':  return new THREE.Vector3(rx, CABLE_Y, rz - depth / 2 + WALL_INSET);
        default:      return new THREE.Vector3(rx, CABLE_Y, rz);
    }
}

// ─── Dal waypoints: cihaz → kavşak, duvar boyunca baseboard rotası ───────────
function buildBranchWaypoints(device, junctionPt, room) {
    const deviceY = device.position[1] ?? 0;
    const devXZ = new THREE.Vector3(device.position[0], CABLE_Y, device.position[2]);
    const pts = deviceY > CABLE_Y + 0.2
        ? [new THREE.Vector3(device.position[0], deviceY, device.position[2]), devXZ]
        : [devXZ.clone()];

    // Kavşak noktasının hangi duvarda olduğunu belirle
    const [rx, , rz] = room.position;
    const { width, depth } = room.size;
    const leftX  = rx - width / 2 + WALL_INSET;
    const rightX = rx + width / 2 - WALL_INSET;
    const topZ   = rz - depth / 2 + WALL_INSET;
    const botZ   = rz + depth / 2 - WALL_INSET;

    const dRight = Math.abs(junctionPt.x - rightX);
    const dLeft  = Math.abs(junctionPt.x - leftX);
    const dFront = Math.abs(junctionPt.z - botZ);
    const dBack  = Math.abs(junctionPt.z - topZ);
    const minD = Math.min(dRight, dLeft, dFront, dBack);
    let exitWall;
    if      (minD === dRight) exitWall = 'right';
    else if (minD === dLeft)  exitWall = 'left';
    else if (minD === dFront) exitWall = 'front';
    else                       exitWall = 'back';

    // baseboardRoute ile duvar boyunca git
    const basePts = baseboardRoute(devXZ, room, exitWall);
    pts.push(...basePts);
    return pts;
}

// ─── Vertex shader ───────────────────────────────────────────────────────────
const VERT = /* glsl */`
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

// ─── Fragment shader: kayan elektrik darbesi ──────────────────────────────────
const FRAG = /* glsl */`
    uniform float time;
    uniform float speed;
    uniform float phase;
    uniform vec3  baseColor;
    varying vec2  vUv;

    void main() {
        float t    = fract(vUv.x * 6.0 - time * speed + phase);
        float band = smoothstep(0.0, 0.15, t) * smoothstep(0.65, 0.45, t);
        vec3 base  = baseColor * 0.12;
        vec3 pulse = baseColor * 2.5;
        vec3 col   = mix(base, pulse, band);
        gl_FragColor = vec4(col, 1.0);
    }
`;

// ─── TubeGeometry inşa et ─────────────────────────────────────────────────────
function buildTubeGeometry(pts, radius) {
    const clean = dedup(pts);
    if (clean.length < 2) return null;
    const curve = new THREE.CatmullRomCurve3(clean, false, 'catmullrom', CATMULL_TENSION);
    return new THREE.TubeGeometry(
        curve,
        Math.max(clean.length * SEGS_PER_POINT, 20),
        radius,
        RADIAL_SEGS,
        false,
    );
}

// ─── Uniform hook ─────────────────────────────────────────────────────────────
function useCableUniforms(power_w, phaseIdx) {
    const color = power_w > 1500 ? '#ef4444' : power_w > 500 ? '#f59e0b' : '#22c55e';
    const uniforms = useRef({
        time:      { value: 0 },
        speed:     { value: 0.4 + (power_w / 3000) * 2.0 },
        phase:     { value: (phaseIdx * 0.618) % 1.0 },
        baseColor: { value: new THREE.Color(color) },
    }).current;
    useEffect(() => {
        uniforms.speed.value = 0.4 + (power_w / 3000) * 2.0;
        uniforms.baseColor.value.set(power_w > 1500 ? '#ef4444' : power_w > 500 ? '#f59e0b' : '#22c55e');
    }, [power_w]); // eslint-disable-line
    useFrame(({ clock }) => { uniforms.time.value = clock.elapsedTime; });
    return uniforms;
}

// ─── Küçük kavşak kutusu ──────────────────────────────────────────────────────
function JunctionBox({ position }) {
    return (
        <group position={position}>
            {/* Kasa */}
            <mesh position={[0, 0.028, 0]}>
                <boxGeometry args={[0.07, 0.055, 0.035]} />
                <meshStandardMaterial color="#1e293b" roughness={0.25} metalness={0.85} />
            </mesh>
            {/* Kapak */}
            <mesh position={[0, 0.028, 0.019]}>
                <boxGeometry args={[0.062, 0.048, 0.005]} />
                <meshStandardMaterial color="#334155" roughness={0.2} metalness={0.9} />
            </mesh>
            {/* Yeşil durum LED'i */}
            <mesh position={[0.022, 0.046, 0.022]}>
                <sphereGeometry args={[0.004, 6, 6]} />
                <meshStandardMaterial color="#22c55e" emissive="#22c55e" emissiveIntensity={1.2} roughness={0.1} />
            </mesh>
        </group>
    );
}

// ─── Dal kablo: cihaz → oda kavşağı ──────────────────────────────────────────
function BranchCable({ device, junctionPt, room, power, phaseIdx }) {
    const uniforms = useCableUniforms(power, phaseIdx);
    const posKey  = device.position.join(',');
    const jKey    = `${junctionPt.x.toFixed(3)},${junctionPt.z.toFixed(3)}`;
    const roomKey = `${room.position[0]},${room.position[2]},${room.size.width},${room.size.depth}`;

    const geometry = useMemo(() => {
        const pts = buildBranchWaypoints(device, junctionPt, room);
        return buildTubeGeometry(pts, CABLE_RADIUS_BRANCH);
    }, [device.id, posKey, jKey, roomKey]); // eslint-disable-line

    useEffect(() => () => { geometry?.dispose(); }, [geometry]);
    if (!geometry) return null;
    return (
        <mesh geometry={geometry}>
            <shaderMaterial uniforms={uniforms} vertexShader={VERT} fragmentShader={FRAG} side={THREE.FrontSide} />
        </mesh>
    );
}

// ─── Trunk kablo: oda kavşağı → sigorta kutusu ───────────────────────────────
function TrunkCable({ roomId, junctionPt, rooms, roomLinks, hubRoomId, hubConnect, power, phaseIdx, roomsKey, hubPosKey }) {
    const uniforms = useCableUniforms(power, phaseIdx);
    const jKey     = `${junctionPt.x.toFixed(3)},${junctionPt.z.toFixed(3)}`;
    const linksKey = roomLinks.map(l => `${l.fromId}-${l.toId}-${l.fromWall}`).join('|');

    const geometry = useMemo(() => {
        const fakeDevice = { id: `trunk-${roomId}`, roomId, position: [junctionPt.x, CABLE_Y, junctionPt.z] };
        const pts = buildWaypoints(fakeDevice, rooms, roomLinks, hubRoomId, hubConnect);
        return buildTubeGeometry(pts, CABLE_RADIUS_TRUNK);
    }, [roomId, jKey, roomsKey, linksKey, hubRoomId, hubPosKey]); // eslint-disable-line

    useEffect(() => () => { geometry?.dispose(); }, [geometry]);
    if (!geometry) return null;
    return (
        <mesh geometry={geometry}>
            <shaderMaterial uniforms={uniforms} vertexShader={VERT} fragmentShader={FRAG} side={THREE.FrontSide} />
        </mesh>
    );
}

// ─── Doğrudan kablo: hub odası veya izole cihazlar ───────────────────────────
function DirectCable({ device, rooms, roomLinks, hubRoomId, hubConnect, power, phaseIdx, roomsKey, hubPosKey }) {
    const uniforms = useCableUniforms(power, phaseIdx);
    const posKey   = device.position.join(',');
    const linksKey = roomLinks.map(l => `${l.fromId}-${l.toId}-${l.fromWall}`).join('|');

    const geometry = useMemo(() => {
        const pts = buildWaypoints(device, rooms, roomLinks, hubRoomId, hubConnect);
        return buildTubeGeometry(pts, CABLE_RADIUS_BRANCH);
    }, [device.id, posKey, roomsKey, linksKey, hubRoomId, hubPosKey]); // eslint-disable-line

    useEffect(() => () => { geometry?.dispose(); }, [geometry]);
    if (!geometry) return null;
    return (
        <mesh geometry={geometry}>
            <shaderMaterial uniforms={uniforms} vertexShader={VERT} fragmentShader={FRAG} side={THREE.FrontSide} />
        </mesh>
    );
}

// ─── Ana bileşen ──────────────────────────────────────────────────────────────
const ElectricWiring = () => {
    const rooms       = useSceneStore(s => s.rooms);
    const objects     = useSceneStore(s => s.objects);
    const deviceSpecs = useSceneStore(s => s.deviceSpecs);

    const hubObj    = objects.find(o => o.type === 'electric_hub');
    const hubPosKey = hubObj ? hubObj.position.join(',') : 'none';
    const roomsKey  = rooms.map(r => `${r.id}:${r.position[0]},${r.position[2]}:${r.size.width},${r.size.depth}`).join('|');

    const derivedLinks = useMemo(() => deriveRoomLinks(rooms), [roomsKey]); // eslint-disable-line
    const hubConnect   = useMemo(
        () => hubObj ? new THREE.Vector3(hubObj.position[0], CABLE_Y, hubObj.position[2]) : null,
        [hubPosKey], // eslint-disable-line
    );

    const cableTargets = objects.filter(o => o.type !== 'electric_hub');
    if (!hubObj || !hubConnect || cableTargets.length === 0) return null;

    const hubRoomId = hubObj.roomId;

    // ─── Cihazları odaya göre grupla ──────────────────────────────────────────
    const roomGroups = {};
    for (const obj of cableTargets) {
        if (!obj.roomId) continue;
        (roomGroups[obj.roomId] ??= []).push(obj);
    }

    // phaseIdx her kablo için deterministic, render başına sıfırlanır
    let phaseCounter = 0;

    return (
        <group>
            {Object.entries(roomGroups).map(([roomId, devices]) => {
                const room = rooms.find(r => r.id === roomId);
                if (!room) return null;

                // Hub odası veya izole oda → doğrudan bağlantı
                if (roomId === hubRoomId) {
                    return devices.map(device => {
                        const power = deviceSpecs[device.id]?.nominal_power_watts || 200;
                        return (
                            <DirectCable
                                key={device.id}
                                device={device}
                                rooms={rooms}
                                roomLinks={derivedLinks}
                                hubRoomId={hubRoomId}
                                hubConnect={hubConnect}
                                power={power}
                                phaseIdx={phaseCounter++}
                                roomsKey={roomsKey}
                                hubPosKey={hubPosKey}
                            />
                        );
                    });
                }

                const junctionPt = getRoomJunction(room, derivedLinks, hubRoomId);

                // Junction bulunamazsa (izole oda) → doğrudan bağlantı
                if (!junctionPt) {
                    return devices.map(device => {
                        const power = deviceSpecs[device.id]?.nominal_power_watts || 200;
                        return (
                            <DirectCable
                                key={device.id}
                                device={device}
                                rooms={rooms}
                                roomLinks={derivedLinks}
                                hubRoomId={hubRoomId}
                                hubConnect={hubConnect}
                                power={power}
                                phaseIdx={phaseCounter++}
                                roomsKey={roomsKey}
                                hubPosKey={hubPosKey}
                            />
                        );
                    });
                }

                const avgPower = devices.reduce((s, d) =>
                    s + (deviceSpecs[d.id]?.nominal_power_watts || 200), 0
                ) / devices.length;

                const trunkPhase = phaseCounter++;

                return (
                    <group key={roomId}>
                        {/* Kavşak kutusu görseli */}
                        <JunctionBox position={[junctionPt.x, junctionPt.y, junctionPt.z]} />

                        {/* Oda trunk kablosu (kavşak → sigorta kutusu) */}
                        <TrunkCable
                            roomId={roomId}
                            junctionPt={junctionPt}
                            rooms={rooms}
                            roomLinks={derivedLinks}
                            hubRoomId={hubRoomId}
                            hubConnect={hubConnect}
                            power={avgPower}
                            phaseIdx={trunkPhase}
                            roomsKey={roomsKey}
                            hubPosKey={hubPosKey}
                        />

                        {/* Her cihazdan ince dal kablolar */}
                        {devices.map(device => {
                            const power = deviceSpecs[device.id]?.nominal_power_watts || 200;
                            return (
                                <BranchCable
                                    key={device.id}
                                    device={device}
                                    junctionPt={junctionPt}
                                    room={room}
                                    power={power}
                                    phaseIdx={phaseCounter++}
                                />
                            );
                        })}
                    </group>
                );
            })}
        </group>
    );
};

export default ElectricWiring;

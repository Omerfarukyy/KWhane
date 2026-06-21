import React from 'react';
import { Html } from '@react-three/drei';
import useSceneStore from '../../store/useSceneStore';

/**
 * SelectionRotateControl — küçük döndürme paneli.
 *
 * Seçili bir oda ya da cihazın üstünde, iki yönlü 90° döndürme butonu olan
 * minik bir popup gösterir. Cihazlar için store.rotateSelected, odalar için
 * store.rotateRoom çağrılır. Yalnızca oluşturma modunda ve sürükleme yokken
 * görünür.
 */
const SelectionRotateControl = () => {
    const selectedId     = useSceneStore((s) => s.selectedId);
    const isCreationMode = useSceneStore((s) => s.isCreationMode);
    const isDragging     = useSceneStore((s) => s.isDragging);
    const rooms          = useSceneStore((s) => s.rooms);
    const objects        = useSceneStore((s) => s.objects);
    const rotateSelected = useSceneStore((s) => s.rotateSelected);
    const rotateRoom     = useSceneStore((s) => s.rotateRoom);

    if (!isCreationMode || isDragging || !selectedId) return null;

    const room = rooms.find((r) => r.id === selectedId);
    const obj  = room ? null : objects.find((o) => o.id === selectedId);
    if (!room && !obj) return null;

    const isRoom = !!room;
    // Float the controls well clear of the kWh badge / room-name label below so
    // they don't crowd the object.
    const position = isRoom
        ? [room.position[0], room.size.height + 1.7, room.position[2]]
        : [obj.position[0], obj.position[1] + (obj.size?.[1] || 1) + 1.0, obj.position[2]];

    const turn = (dir) => (e) => {
        e.stopPropagation();
        if (isRoom) rotateRoom(selectedId, dir);
        else rotateSelected(dir);
    };

    return (
        <Html
            position={position}
            center
            distanceFactor={9}
            // Constant z-index above every other Html overlay (room labels and
            // kWh badges use drei's default range up to ~16.7M), so the rotate
            // controls always render on top and reliably receive clicks.
            zIndexRange={[2147483646, 2147483646]}
            style={{ pointerEvents: 'auto' }}
        >
            <div
                style={styles.bar}
                onPointerDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                <button style={styles.btn} onClick={turn(-1)} title="90° döndür">
                    <RotateIcon />
                </button>
                <div style={styles.divider} />
                <button style={styles.btn} onClick={turn(1)} title="90° döndür">
                    <RotateIcon flipped />
                </button>
            </div>
        </Html>
    );
};

const RotateIcon = ({ flipped }) => (
    <svg
        width="24" height="24" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
        style={flipped ? { transform: 'scaleX(-1)' } : undefined}
    >
        <path d="M3 12a9 9 0 1 0 3-6.7" />
        <path d="M3 3v4h4" />
    </svg>
);

const styles = {
    bar: {
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        background: 'var(--color-surface-glass)',
        border: '1px solid var(--color-border-2)',
        borderRadius: 14,
        padding: 5,
        backdropFilter: 'blur(14px)',
        boxShadow: '0 6px 20px rgba(0,0,0,0.25)',
        userSelect: 'none',
    },
    btn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: 46,
        height: 46,
        background: 'var(--color-highlight)',
        border: 'none',
        borderRadius: 10,
        color: 'var(--color-text)',
        cursor: 'pointer',
        transition: 'all 0.15s',
    },
    divider: {
        width: 1,
        height: 26,
        background: 'var(--color-border-2)',
    },
};

export default SelectionRotateControl;

import { useEffect, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

/**
 * KeyboardCameraControls — BG3 tarzı klavye kamera kontrolleri.
 *
 * W/S: kameranın baktığı yöne ileri/geri (Y dahil — aşağı bakıyorsa aşağı dalar)
 * A/D: sol/sağ strafe (zemine paralel)
 * Q/E: target etrafında saat yönü / saat yönünün tersine yaw rotasyonu
 *
 * Translate hareketlerinde camera.position ve controls.target birlikte kaydırılır.
 * Yaw için camera.position target etrafında döner; target sabit kalır.
 *
 * Hız, kameranın hedeften uzaklığına göre ölçeklenir.
 *
 * Input alanlarında (AiAssistant vb.) yazarken hareket
 * tetiklenmesin diye activeElement INPUT/TEXTAREA/contentEditable ise atlanır.
 */
const KeyboardCameraControls = ({ baseSpeed = 14, rotateSpeed = 1.6 }) => {
    const { camera, controls } = useThree();
    const keys = useRef(new Set());

    const forward = useRef(new THREE.Vector3());
    const right = useRef(new THREE.Vector3());
    const move = useRef(new THREE.Vector3());
    const offset = useRef(new THREE.Vector3());
    const yawAxis = useRef(new THREE.Vector3(0, 1, 0));

    useEffect(() => {
        const isTypingTarget = (el) => {
            if (!el) return false;
            const tag = el.tagName;
            if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
            if (el.isContentEditable) return true;
            return false;
        };

        const handleDown = (e) => {
            if (isTypingTarget(document.activeElement)) return;
            const k = e.key.toLowerCase();
            if (['w', 'a', 's', 'd', 'q', 'e'].includes(k)) {
                keys.current.add(k);
            }
        };

        const handleUp = (e) => {
            const k = e.key.toLowerCase();
            keys.current.delete(k);
        };

        const handleBlur = () => keys.current.clear();

        window.addEventListener('keydown', handleDown);
        window.addEventListener('keyup', handleUp);
        window.addEventListener('blur', handleBlur);

        return () => {
            window.removeEventListener('keydown', handleDown);
            window.removeEventListener('keyup', handleUp);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);

    useFrame((_, delta) => {
        if (keys.current.size === 0) return;

        const target = controls?.target;
        const distance = target ? camera.position.distanceTo(target) : 10;
        const speedScale = Math.max(0.3, distance / 10);

        // ─── Q / E : target etrafında yaw rotasyonu ────────────────────
        if (target && (keys.current.has('q') || keys.current.has('e'))) {
            let angle = 0;
            // Q: saat yönü (yukarıdan bakınca) → Y ekseni etrafında negatif
            if (keys.current.has('q')) angle -= rotateSpeed * delta;
            if (keys.current.has('e')) angle += rotateSpeed * delta;

            offset.current.copy(camera.position).sub(target);
            offset.current.applyAxisAngle(yawAxis.current, angle);
            camera.position.copy(target).add(offset.current);
            camera.lookAt(target);
        }

        // ─── W / A / S / D : translate ─────────────────────────────────
        if (
            keys.current.has('w') ||
            keys.current.has('a') ||
            keys.current.has('s') ||
            keys.current.has('d')
        ) {
            // W/S için tam bakış yönü (Y dahil)
            camera.getWorldDirection(forward.current);

            // A/D için zemine paralel sağ vektör (forward'ı yatayda projeleyip cross al)
            right.current.set(forward.current.x, 0, forward.current.z);
            if (right.current.lengthSq() < 1e-6) {
                right.current.set(1, 0, 0);
            } else {
                right.current.normalize();
                right.current.crossVectors(right.current, camera.up).normalize();
            }

            move.current.set(0, 0, 0);
            if (keys.current.has('w')) move.current.add(forward.current);
            if (keys.current.has('s')) move.current.sub(forward.current);
            if (keys.current.has('d')) move.current.add(right.current);
            if (keys.current.has('a')) move.current.sub(right.current);

            if (move.current.lengthSq() > 0) {
                move.current.normalize().multiplyScalar(baseSpeed * speedScale * delta);
                camera.position.add(move.current);
                if (target) target.add(move.current);
            }
        }

        controls?.update?.();
    });

    return null;
};

export default KeyboardCameraControls;

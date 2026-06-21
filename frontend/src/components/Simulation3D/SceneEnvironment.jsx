/**
 * SceneEnvironment.jsx — Procedural Image-Based Lighting (IBL).
 *
 * Builds a small environment cube map from <Lightformer>s (zero external
 * download) so MeshStandardMaterial surfaces get realistic ambient light and
 * reflections instead of looking flat/plastic. Theme-aware: a warm daytime
 * studio vs. a cool dim night. `background={false}` so it only contributes
 * lighting — the existing <Sky>/<Stars> stay as the visible backdrop.
 *
 * Baked once (`frames={1}`) and re-keyed on theme change, so it costs nothing
 * under frameloop="demand".
 */
import { Environment, Lightformer } from '@react-three/drei';

const SceneEnvironment = ({ isDark }) => {
    if (isDark) {
        return (
            <Environment
                key="env-night"
                background={false}
                resolution={256}
                frames={1}
                environmentIntensity={0.3}
            >
                {/* Dark base tone */}
                <color attach="background" args={['#0b1224']} />
                {/* Cool moon key from the sun/moon direction */}
                <Lightformer
                    form="rect"
                    intensity={0.6}
                    color="#aac0f0"
                    position={[4, 6, 3]}
                    rotation={[-Math.PI / 3, 0, 0]}
                    scale={[8, 8, 1]}
                />
                {/* Faint blue fill */}
                <Lightformer
                    form="rect"
                    intensity={0.18}
                    color="#1c2740"
                    position={[-5, 3, -4]}
                    rotation={[Math.PI / 6, Math.PI, 0]}
                    scale={[10, 6, 1]}
                />
            </Environment>
        );
    }

    return (
        <Environment
            key="env-day"
            background={false}
            resolution={256}
            frames={1}
            environmentIntensity={0.55}
        >
            {/* Soft sky base */}
            <color attach="background" args={['#cfe0ff']} />
            {/* Warm overhead soft box (ceiling/sky bounce) */}
            <Lightformer
                form="rect"
                intensity={1.1}
                color="#fff4e0"
                position={[0, 6, 0]}
                rotation={[Math.PI / 2, 0, 0]}
                scale={[12, 12, 1]}
            />
            {/* Warm key, aligned with the sun direction */}
            <Lightformer
                form="rect"
                intensity={1.6}
                color="#ffe6bf"
                position={[5, 5, 3]}
                rotation={[-Math.PI / 3, 0, 0]}
                scale={[8, 8, 1]}
            />
            {/* Cool sky fill from the opposite side */}
            <Lightformer
                form="rect"
                intensity={0.7}
                color="#a8c6ff"
                position={[-6, 4, -4]}
                rotation={[Math.PI / 6, Math.PI, 0]}
                scale={[10, 7, 1]}
            />
        </Environment>
    );
};

export default SceneEnvironment;

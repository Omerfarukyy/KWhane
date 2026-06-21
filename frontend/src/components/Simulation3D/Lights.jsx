/**
 * Lights.jsx — Theme-synced scene lighting.
 *
 * Light mode: warm sun, blue sky hemisphere fill, sky-blue tint.
 * Dark mode: cool moon-like directional, dim hemisphere, low ambient.
 */
import { useTheme } from '../../contexts/ThemeProvider';

const SUN_POSITION = [40, 50, 25];

const Lights = () => {
    const { theme } = useTheme();
    const isDark = theme === 'dark';

    return (
        <>
            {/* IBL (SceneEnvironment) now supplies most of the ambient fill, so
                hemisphere + ambient are dialled back and the sun is pushed up to
                read correctly through ACES tone mapping. */}
            <hemisphereLight
                args={isDark
                    ? ['#1a2438', '#0a0f1c', 0.3]
                    : ['#b8d9ff', '#4a6b3a', 0.4]}
            />

            <ambientLight intensity={isDark ? 0.05 : 0.15} />

            <directionalLight
                position={SUN_POSITION}
                intensity={isDark ? 0.7 : 2.0}
                color={isDark ? '#cdd9ff' : '#fff2d6'}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-near={0.5}
                shadow-camera-far={260}
                shadow-camera-left={-105}
                shadow-camera-right={105}
                shadow-camera-top={105}
                shadow-camera-bottom={-105}
                shadow-bias={-0.0005}
            />
        </>
    );
};

export { SUN_POSITION };
export default Lights;

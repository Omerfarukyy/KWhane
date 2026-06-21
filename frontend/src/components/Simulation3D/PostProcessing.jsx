/**
 * PostProcessing.jsx — declarative EffectComposer for the simulation.
 *
 *  • N8AO  — screen-space ambient occlusion: adds real depth/contrast in wall
 *            corners, furniture creases and where objects meet the floor. This
 *            is the single biggest "low-poly → professional" lever.
 *  • Bloom — high luminance threshold so ONLY emissive LEDs / screens / lamps
 *            glow (the device animations become a feature, not noise).
 *  • SMAA  — clean edge anti-aliasing.
 *
 * Renderer-level ACES tone mapping (Canvas gl) stays the single tone-mapping
 * stage, so the image looks consistent whether the composer is mounted or not —
 * important because the adaptive `tier` can disable it entirely on weak devices.
 *
 * Works under frameloop="demand": EffectComposer registers a prioritised
 * useFrame and renders on each invalidated frame driven by SceneAnimationLoop.
 */
import { EffectComposer, N8AO, Bloom, SMAA } from '@react-three/postprocessing';

const PostProcessing = ({ tier = 'high' }) => {
    // Low tier → skip the whole composer; renderer falls back to plain ACES.
    if (tier === 'low') return null;

    const medium = tier === 'medium';

    return (
        <EffectComposer multisampling={0} enableNormalPass={false}>
            <N8AO
                aoRadius={0.8}
                distanceFalloff={1.0}
                intensity={medium ? 2.4 : 3.2}
                quality={medium ? 'low' : 'medium'}
                halfRes={medium}
                color="#0a0a0a"
            />
            <Bloom
                mipmapBlur
                luminanceThreshold={0.85}
                luminanceSmoothing={0.2}
                intensity={0.7}
            />
            <SMAA />
        </EffectComposer>
    );
};

export default PostProcessing;

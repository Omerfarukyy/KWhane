import { Component, Suspense, useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { FURNITURE_PALETTE, getFurnitureAsset } from './FurnitureRegistry';

const DRACO_PATH = '/models/draco/';
const preparedScenes = new WeakMap();

const MATERIAL_COLORS = {
    _defaultMat: FURNITURE_PALETTE.warmWhite,
    wood: FURNITURE_PALETTE.lightOak,
    woodDark: FURNITURE_PALETTE.darkOak,
    metal: FURNITURE_PALETTE.charcoal,
    metalDark: '#252b30',
    metalMedium: '#707b83',
    metalLight: FURNITURE_PALETTE.steel,
    carpet: FURNITURE_PALETTE.beige,
    carpetBlue: FURNITURE_PALETTE.mutedBlue,
    carpetDarker: '#8b6f5b',
    carpetWhite: FURNITURE_PALETTE.warmWhite,
    lamp: FURNITURE_PALETTE.warmLight,
};

function warmMaterial(material) {
    const name = material?.name || '_defaultMat';
    if (name === 'glass') {
        return new THREE.MeshStandardMaterial({
            name,
            color: '#c8dbe3',
            transparent: true,
            opacity: 0.32,
            roughness: 0.12,
            metalness: 0,
            depthWrite: false,
        });
    }
    const color = MATERIAL_COLORS[name] || material?.color || FURNITURE_PALETTE.warmWhite;
    return new THREE.MeshStandardMaterial({
        name,
        color,
        roughness: name.startsWith('metal') ? 0.34 : 0.78,
        metalness: name.startsWith('metal') ? 0.62 : 0.02,
        envMapIntensity: 0.55,
        emissive: name === 'lamp' ? FURNITURE_PALETTE.warmLight : '#000000',
        emissiveIntensity: name === 'lamp' ? 0.22 : 0,
    });
}

function prepareScene(scene, source) {
    if (preparedScenes.has(scene)) return preparedScenes.get(scene);
    const prepared = scene.clone(true);
    const materials = new Map();
    prepared.traverse((object) => {
        if (!object.isMesh) return;
        object.castShadow = true;
        object.receiveShadow = true;
        object.raycast = () => null;
        const convert = (material) => {
            if (materials.has(material)) return materials.get(material);
            let next;
            if (source === 'kenney') {
                next = warmMaterial(material);
            } else {
                next = material.clone();
                next.envMapIntensity = 0.65;
            }
            materials.set(material, next);
            return next;
        };
        object.material = Array.isArray(object.material)
            ? object.material.map(convert)
            : convert(object.material);
    });
    preparedScenes.set(scene, prepared);
    return prepared;
}

function normalizedAsset(scene, asset) {
    const prepared = prepareScene(scene, asset.source);
    prepared.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(prepared);
    const nativeSize = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const scale = new THREE.Vector3(
        asset.size[0] / Math.max(nativeSize.x, 0.001),
        asset.size[1] / Math.max(nativeSize.y, 0.001),
        asset.size[2] / Math.max(nativeSize.z, 0.001),
    );
    const pivot = asset.pivotCorrection || [0, 0, 0];
    const offset = new THREE.Vector3(
        -center.x + pivot[0] / scale.x,
        -bounds.min.y + pivot[1] / scale.y,
        -center.z + pivot[2] / scale.z,
    );
    return { prepared, scale, offset };
}

const FootprintFallback = ({ asset, position = [0, 0, 0], rotation = 0 }) => (
    <mesh position={[position[0], position[1] + asset.size[1] / 2, position[2]]} rotation={[0, rotation, 0]} raycast={() => null}>
        <boxGeometry args={asset.size} />
        <meshStandardMaterial color="#b8aa94" roughness={0.9} transparent opacity={0.28} depthWrite={false} />
    </mesh>
);

export class AssetBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = { failed: false };
    }
    static getDerivedStateFromError() { return { failed: true }; }
    componentDidCatch(error) {
        console.warn('[FurnitureAsset] model failed, using footprint fallback:', error?.message);
    }
    render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

function LoadedFurniture({ asset, position, rotation, scale: placementScale }) {
    const { scene } = useGLTF(asset.url, DRACO_PATH);
    const normalized = useMemo(() => normalizedAsset(scene, asset), [scene, asset]);
    const model = useMemo(() => normalized.prepared.clone(true), [normalized]);
    const extra = placementScale || [1, 1, 1];
    const scale = [
        normalized.scale.x * extra[0],
        normalized.scale.y * extra[1],
        normalized.scale.z * extra[2],
    ];

    return (
        <group position={position} rotation={[0, rotation, 0]} scale={scale}>
            <primitive object={model} position={normalized.offset} dispose={null} />
        </group>
    );
}

export const FurnitureModel = ({ assetKey, position = [0, 0, 0], rotation = 0, scale = [1, 1, 1] }) => {
    const asset = getFurnitureAsset(assetKey);
    if (!asset) return null;
    const fallback = <FootprintFallback asset={asset} position={position} rotation={rotation} />;
    return (
        <AssetBoundary fallback={fallback}>
            <Suspense fallback={fallback}>
                <LoadedFurniture asset={asset} position={position} rotation={rotation} scale={scale} />
            </Suspense>
        </AssetBoundary>
    );
};

function LoadedInstances({ asset, transforms }) {
    const { scene } = useGLTF(asset.url, DRACO_PATH);
    const objects = useMemo(() => {
        const { prepared, scale, offset } = normalizedAsset(scene, asset);
        prepared.updateMatrixWorld(true);
        const results = [];
        prepared.traverse((mesh) => {
            if (!mesh.isMesh) return;
            const instanced = new THREE.InstancedMesh(mesh.geometry, mesh.material, transforms.length);
            instanced.castShadow = true;
            instanced.receiveShadow = true;
            instanced.raycast = () => null;
            transforms.forEach((transform, index) => {
                const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, transform.rotation || 0, 0));
                const placement = new THREE.Matrix4().compose(
                    new THREE.Vector3(...transform.position),
                    rotation,
                    new THREE.Vector3(1, 1, 1),
                );
                const extra = transform.scale || [1, 1, 1];
                const normalizeScale = new THREE.Matrix4().makeScale(
                    scale.x * extra[0],
                    scale.y * extra[1],
                    scale.z * extra[2],
                );
                const normalizeOffset = new THREE.Matrix4().makeTranslation(offset.x, offset.y, offset.z);
                const matrix = placement
                    .multiply(normalizeScale)
                    .multiply(normalizeOffset)
                    .multiply(mesh.matrixWorld);
                instanced.setMatrixAt(index, matrix);
            });
            instanced.instanceMatrix.needsUpdate = true;
            instanced.computeBoundingBox();
            instanced.computeBoundingSphere();
            results.push(instanced);
        });
        return results;
    }, [scene, asset, transforms]);

    return objects.map((object, index) => <primitive key={index} object={object} dispose={null} />);
}

export const FurnitureInstances = ({ assetKey, transforms }) => {
    const asset = getFurnitureAsset(assetKey);
    if (!asset || !transforms.length) return null;
    const fallback = (
        <group>
            {transforms.map((transform, index) => (
                <FootprintFallback key={index} asset={asset} position={transform.position} rotation={transform.rotation || 0} />
            ))}
        </group>
    );
    return (
        <AssetBoundary fallback={fallback}>
            <Suspense fallback={fallback}>
                <LoadedInstances asset={asset} transforms={transforms} />
            </Suspense>
        </AssetBoundary>
    );
};

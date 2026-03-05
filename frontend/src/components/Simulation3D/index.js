/**
 * Simulation3D — Barrel Export
 *
 * Bu modülü kullanmak için:
 *   import { SceneContainer, DraggableObject, DeviceModel } from './components/Simulation3D';
 *
 * Bileşenler:
 *  - SceneContainer  : Ana 3D sahne konteyner bileşeni (Canvas + collision)
 *  - RoomBuilder     : Dinamik oda oluşturucu (4 duvar + zemin)
 *  - Lights          : Sahne aydınlatması (ambient + directional)
 *  - CameraControls  : OrbitControls sarmalayıcı (pan/zoom limitleri)
 *  - DraggableObject : Zemin üzerinde sürükleme + grid snapping + çarpışma
 *  - DeviceModel     : GLTF/GLB model yükleyici (useGLTF)
 *  - useCollision    : Çarpışma algılama hook'u (AABB)
 */
export { default as SceneContainer } from './SceneContainer';
export { default as RoomBuilder } from './RoomBuilder';
export { default as Lights } from './Lights';
export { default as CameraControls } from './CameraControls';
export { default as DraggableObject } from './DraggableObject';
export { default as DeviceModel } from './DeviceModel';
export { default as useCollision } from './useCollision';

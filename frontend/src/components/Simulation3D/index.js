/**
 * Simulation3D — Barrel Export
 *
 * Bu modülü kullanmak için:
 *   import { SceneContainer, DraggableObject } from './components/Simulation3D';
 *
 * Bileşenler:
 *  - SceneContainer  : Ana 3D sahne konteyner bileşeni
 *  - RoomBuilder     : Dinamik oda oluşturucu
 *  - Lights          : Sahne aydınlatması
 *  - CameraControls  : OrbitControls sarmalayıcı (pan/zoom limitleri)
 *  - DraggableObject : Zemin üzerinde sürükleme + grid snapping
 */
export { default as SceneContainer } from './SceneContainer';
export { default as RoomBuilder } from './RoomBuilder';
export { default as Lights } from './Lights';
export { default as CameraControls } from './CameraControls';
export { default as DraggableObject } from './DraggableObject';

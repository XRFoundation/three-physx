import { Object3D, BufferGeometry } from 'three';
import { PhysXShapeConfig } from './types/ThreePhysX';
export declare const createPhysXShapes: (object: any) => PhysXShapeConfig[];
export declare const createPhysXBody: (object: any, id: any, shapes?: any) => void;
export declare const iterateGeometries: (root: any, options: any, cb: any) => void;
export declare const getTransformFromWorldPos: (obj: Object3D) => {
    translation: {
        x: number;
        y: number;
        z: number;
    };
    rotation: {
        x: number;
        y: number;
        z: number;
        w: number;
    };
    scale: {
        x: number;
        y: number;
        z: number;
    };
    linearVelocity: {
        x: number;
        y: number;
        z: number;
    };
    angularVelocity: {
        x: number;
        y: number;
        z: number;
    };
};
/**
 * Returns a single geometry for the given object. If the object is compound,
 * its geometries are automatically merged.
 * @param {Object3D} object
 * @return {BufferGeometry}
 */
export declare function getGeometry(object: any): BufferGeometry;

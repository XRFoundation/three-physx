import { Vector3, Matrix4, Quaternion, } from 'three';
import { PhysXBodyType, PhysXModelShapes, } from './types/ThreePhysX';
const transform = new Matrix4();
const inverse = new Matrix4();
const vec3 = new Vector3();
const quat = new Quaternion();
//createPhysXBody(entity, id, threeToPhysXModelDescription(entity, { type: threeToPhysXModelDescription.Shape.MESH }), true)
export const threeToPhysX = (object, id) => {
    object.updateMatrixWorld(true);
    if (object.parent) {
        inverse.copy(object.parent.matrixWorld).invert();
        transform.multiplyMatrices(inverse, object.matrixWorld);
    }
    else {
        transform.copy(object.matrixWorld);
    }
    const type = object.userData.physx
        ? object.userData.physx.type
        : PhysXBodyType.STATIC;
    const shapes = [];
    object.updateMatrixWorld(true);
    iterateGeometries(object, { includeInvisible: true }, (data) => {
        shapes.push(data);
    });
    const rot = object.getWorldQuaternion(quat);
    const pos = object.getWorldPosition(vec3);
    const bodyConfig = {
        shapes,
        bodyOptions: {
            type,
        },
    };
    const body = {
        id,
        bodyConfig,
        transform: {
            translation: { x: pos.x, y: pos.y, z: pos.z },
            rotation: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
        },
    };
    if (bodyConfig.bodyOptions.type === PhysXBodyType.DYNAMIC) {
        body.transform.linearVelocity = { x: 0, y: 0, z: 0 };
        body.transform.angularVelocity = { x: 0, y: 0, z: 0 };
    }
    object.body = body;
    return body;
};
// from three-to-ammo
export const iterateGeometries = (function () {
    return function (root, options, cb) {
        inverse.copy(root.matrixWorld).invert();
        const scale = new Vector3();
        scale.setFromMatrixScale(root.matrixWorld);
        root.traverse((mesh) => {
            const transform = new Matrix4();
            if (mesh.isMesh &&
                mesh.name !== 'Sky' &&
                (options.includeInvisible || mesh.visible)) {
                if (mesh === root) {
                    transform.identity();
                }
                else {
                    mesh.updateWorldMatrix(true, false);
                    transform.multiplyMatrices(inverse, mesh.matrixWorld);
                }
                // todo: might want to return null xform if this is the root so that callers can avoid multiplying
                // things by the identity matrix
                const shape = getGeometryShape(mesh);
                const vertices = Array.from(mesh.geometry.attributes.position.array);
                const matrix = transform.elements;
                const indices = Array.from(mesh.geometry.index.array);
                switch (shape) {
                    case PhysXModelShapes.Box:
                        cb({
                            shape,
                            options: { boxExtents: getBoxExtents(mesh.geometry) },
                        });
                        break;
                    case PhysXModelShapes.Plane:
                        cb({ shape });
                        break;
                    case PhysXModelShapes.Sphere:
                        cb({
                            shape,
                            options: {
                                sphereRadius: mesh.geometry.parameters
                                    .radius,
                            },
                        });
                        break;
                    case PhysXModelShapes.TriangleMesh:
                    default:
                        cb({ shape, vertices, matrix, indices });
                        break;
                }
            }
        });
    };
})();
const getGeometryShape = (mesh) => {
    var _a, _b, _c;
    const type = ((_a = mesh.metadata) === null || _a === void 0 ? void 0 : _a.type) || ((_c = (_b = mesh.geometry) === null || _b === void 0 ? void 0 : _b.metadata) === null || _c === void 0 ? void 0 : _c.type) || mesh.geometry.type;
    switch (type) {
        case 'BoxGeometry':
        case 'BoxBufferGeometry':
            return PhysXModelShapes.Box;
        // case 'CylinderGeometry':
        // case 'CylinderBufferGeometry':
        //   throw new Error('three-physx: Cylinder shape not yet implemented');// createCylinderShape(geometry);
        case 'PlaneGeometry':
        case 'PlaneBufferGeometry':
            return PhysXModelShapes.Plane;
        case 'SphereGeometry':
        case 'SphereBufferGeometry':
            return PhysXModelShapes.Sphere;
        default:
            return PhysXModelShapes.TriangleMesh;
    }
};
const getBoxExtents = function (geometry) {
    geometry.computeBoundingBox();
    const box = geometry.boundingBox;
    return [
        (box.max.x - box.min.x) / 2,
        (box.max.y - box.min.y) / 2,
        (box.max.z - box.min.z) / 2,
    ];
};
//# sourceMappingURL=threeToPhysX.js.map
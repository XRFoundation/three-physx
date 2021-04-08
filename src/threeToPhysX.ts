import {
  Vector3,
  Matrix4,
  Mesh,
  SphereBufferGeometry,
  Quaternion,
  Object3D,
} from 'three';
import { PhysXInstance } from '.';
import {
  PhysXBodyType,
  PhysXModelShapes,
  PhysXShapeConfig,
  RigidBodyProxy,
} from './types/ThreePhysX';

const transform = new Matrix4();
const inverse = new Matrix4();
const vec3 = new Vector3();
const quat = new Quaternion();

//createPhysXBody(entity, id, threeToPhysXModelDescription(entity, { type: threeToPhysXModelDescription.Shape.MESH }), true)
export const createPhysXShapes = (object: any, id: number) => {
  const shapes: PhysXShapeConfig[] = [];
  object.updateMatrixWorld(true);
  iterateGeometries(object, { includeInvisible: true }, (data) => {
    shapes.push(data);
  });
  return shapes;
};

export const createPhysXBody = (object, id, shapes?) => {
  console.log(id)
  const rot = object.getWorldQuaternion(quat);
  const pos = object.getWorldPosition(vec3);
  const type = object.userData.physx
    ? object.userData.physx.type
    : PhysXBodyType.STATIC;

  const body: RigidBodyProxy = {
    id,
    shapes,
    bodyOptions: {
      type,
    },
    transform: {
      translation: { x: pos.x, y: pos.y, z: pos.z },
      rotation: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
    },
  };
  if (body.bodyOptions.type === PhysXBodyType.DYNAMIC) {
    body.transform.linearVelocity = { x: 0, y: 0, z: 0 };
    body.transform.angularVelocity = { x: 0, y: 0, z: 0 };
  }
  object.body = body;
};

const createShape = (mesh, root) => {
  const shape = getGeometryShape(mesh);
  const vertices = Array.from(mesh.geometry.attributes.position.array);
  const transform = getTransformDifferentFromRoot(mesh, root);
  const indices = Array.from(mesh.geometry.index.array);
  const id = PhysXInstance.instance._getNextAvailableShapeID();
  switch (shape) {
    case PhysXModelShapes.Box:
      return {
        id,
        shape,
        transform,
        options: { boxExtents: getBoxExtents(mesh.geometry) },
      };
    case PhysXModelShapes.Plane:
      return { id, transform, shape };
    case PhysXModelShapes.Sphere:
      return {
        id,
        shape,
        transform,
        options: {
          sphereRadius: (mesh.geometry as SphereBufferGeometry).parameters
            .radius,
        },
      };
    case PhysXModelShapes.TriangleMesh:
    default:
      return { id, shape, vertices, transform, indices };
  }
};

// from three-to-ammo
export const iterateGeometries = (function () {
  return function (root, options, cb) {
    inverse.copy(root.matrixWorld).invert();
    const scale = new Vector3();
    scale.setFromMatrixScale(root.matrixWorld);
    root.traverse((mesh: Mesh) => {
      if (
        mesh.isMesh &&
        mesh.name !== 'Sky' &&
        (options.includeInvisible || mesh.visible)
      ) {
        cb(createShape(mesh, root));
      }
    });
  };
})();

const getGeometryShape = (mesh): PhysXModelShapes => {
  switch (mesh.geometry.type) {
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

const getTransformDifferentFromRoot = (mesh: Object3D, root: Object3D) => {
  const pos = new Vector3().subVectors(mesh.getWorldPosition(new Vector3()), root.getWorldPosition(new Vector3()));
  const quat2 = root.getWorldQuaternion(quat)
  const rot = new Quaternion().multiply(mesh.getWorldQuaternion(quat2).invert());
  console.log(rot, quat2, quat, root.getWorldQuaternion(quat), mesh.getWorldQuaternion(quat))
  return {
    translation: { x: pos.x, y: pos.y, z: pos.z },
    rotation: { x: rot.x, y: rot.y, z: rot.z, w: rot.w }
  }
}
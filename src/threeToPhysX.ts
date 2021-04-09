import { Vector3, Matrix4, Mesh, SphereBufferGeometry, Quaternion, Object3D, SphereGeometry } from 'three';
import { PhysXInstance } from '.';
import { PhysXBodyType, PhysXModelShapes, PhysXShapeConfig, RigidBodyProxy, ShapeConfig } from './types/ThreePhysX';

const matrixA = new Matrix4();
const matrixB = new Matrix4();
const pos = new Vector3();
const rot = new Quaternion();
const scale = new Vector3(1, 1, 1);

// TODO: set root to the scene in case objects are parented already

export const createPhysXShapes = (object: any, id: number) => {
  const shapes: PhysXShapeConfig[] = [];
  object.updateMatrixWorld(true);
  iterateGeometries(object, { includeInvisible: true }, (data) => {
    shapes.push(...data);
  });
  return shapes;
};

export const createPhysXBody = (object, id, shapes?) => {
  const transform = getTransformFromWorldPos(object);
  if (!object.userData.physx) {
    object.userData.physx = {
      type: PhysXBodyType.STATIC,
    };
  }
  const type = object.userData.physx.type;

  const body: RigidBodyProxy = {
    id,
    shapes,
    transform,
    options: {
      type,
    },
  };
  object.body = body;
};

const createShapes = (mesh, root): PhysXShapeConfig[] => {
  if (!mesh.userData.physx) {
    mesh.userData.physx = {};
  }
  const shapes: PhysXShapeConfig[] = [];
  if (mesh.userData.physx.shapes) {
    const relativeTransform = getTransformRelativeToRoot(mesh, root);
    mesh.userData.physx.shapes.forEach((shape) => {
      const data = getShapeData(mesh, shape);
      const transform = shape.transform || relativeTransform;
      const id = PhysXInstance.instance._getNextAvailableShapeID();
      data.id = id;
      data.transform = transform;
      data.config = getShapeConfig(shape.config);
      data.config.id = id;
      shapes.push(data);
    });
  } else {
    const data = getGeometryShape(mesh);
    const transform = getTransformRelativeToRoot(mesh, root);
    const id = PhysXInstance.instance._getNextAvailableShapeID();
    data.id = id;
    data.transform = transform;
    data.config = getShapeConfig({});
    data.config.id = id;
    shapes.push(data);
  }
  return shapes;
};

// from three-to-ammo
export const iterateGeometries = (function () {
  return function (root, options, cb) {
    root.traverse((mesh: Mesh) => {
      if (mesh.isMesh && (options.includeInvisible || mesh.visible)) {
        cb(createShapes(mesh, root));
      }
    });
  };
})();

const getShapeConfig = (data) => {
  return {
    isTrigger: data.isTrigger ?? false,
    collisionId: data.collisionId ?? 1,
    collisionMask: data.collisionMask ?? 1,
    staticFriction: data.staticFriction ?? 0.2,
    dynamicFriction: data.dynamicFriction ?? 0.2,
    restitution: data.restitution ?? 0.2
  }
}

const getShapeData = (mesh, shape): any => {
  switch (shape.type) {
    case PhysXModelShapes.Box:
      return {
        shape: shape.type,
        options: { boxExtents: shape.boxExtents || getBoxExtents(mesh) },
      };
    // case PhysXModelShapes.Plane:
    //   return ;
    case PhysXModelShapes.Sphere:
      return {
        shape: shape.type,
        options: { sphereRadius: shape.sphereRadius || getSphereRadius(mesh) },
      };
    case PhysXModelShapes.TriangleMesh:
    default:
      const vertices = Array.from(mesh.geometry.attributes.position.array);
      const indices = Array.from(mesh.geometry.index.array);
      return { shape: shape.type, options: { vertices, indices } };
  }
};

const getGeometryShape = (mesh): any => {
  switch (mesh.geometry.type) {
    case 'BoxGeometry':
    case 'BoxBufferGeometry':
      return {
        shape: PhysXModelShapes.Box,
        options: { boxExtents: getBoxExtents(mesh) },
      };
    // case 'CylinderGeometry':
    // case 'CylinderBufferGeometry':
    //   throw new Error('three-physx: Cylinder shape not yet implemented'); // createCylinderShape(geometry);
    // case 'PlaneGeometry':
    // case 'PlaneBufferGeometry':
    //   return ;
    case 'SphereGeometry':
    case 'SphereBufferGeometry':
      return {
        shape: PhysXModelShapes.Sphere,
        options: { sphereRadius: getSphereRadius(mesh) },
      };
    default:
      const vertices = Array.from(mesh.geometry.attributes.position.array);
      const indices = Array.from(mesh.geometry.index.array);
      return {
        shape: PhysXModelShapes.TriangleMesh,
        options: { vertices, indices },
      };
  }
};

const getSphereRadius = function (mesh: Mesh) {
  const scale = mesh.getWorldScale(pos).lengthSq() / 3;
  return ((mesh.geometry as SphereGeometry)?.parameters?.radius || 1) * scale;
};

const getBoxExtents = function (mesh: Mesh) {
  const worldScale = mesh.getWorldScale(scale);
  mesh.geometry.computeBoundingBox();
  const box = mesh.geometry.boundingBox;
  return {
    x: ((box.max.x - box.min.x) / 2) * worldScale.x,
    y: ((box.max.y - box.min.y) / 2) * worldScale.y,
    z: ((box.max.z - box.min.z) / 2) * worldScale.z,
  };
};

export const getTransformFromWorldPos = (obj: Object3D) => {
  obj.getWorldPosition(pos);
  obj.getWorldQuaternion(rot);
  obj.getWorldScale(scale);
  return {
    translation: { x: pos.x, y: pos.y, z: pos.z },
    rotation: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
    scale: { x: scale.x, y: scale.y, z: scale.z },
    linearVelocity: { x: 0, y: 0, z: 0 },
    angularVelocity: { x: 0, y: 0, z: 0 },
  };
};

const getTransformRelativeToRoot = (mesh: Object3D, root: Object3D) => {
  const worldScale = mesh.getWorldScale(scale);
  // no local transformation
  if (mesh === root) {
    return {
      translation: { x: 0, y: 0, z: 0 },
      rotation: { x: 0, y: 0, z: 0, w: 1 },
      scale: { x: worldScale.x, y: worldScale.y, z: worldScale.z },
    };
  }

  // local transformation
  if (mesh.parent === root) {
    return {
      translation: {
        x: mesh.position.x,
        y: mesh.position.y,
        z: mesh.position.z,
      },
      rotation: {
        x: mesh.quaternion.x,
        y: mesh.quaternion.y,
        z: mesh.quaternion.z,
        w: mesh.quaternion.w,
      },
      scale: { x: worldScale.x, y: worldScale.y, z: worldScale.z },
    };
  }

  // world transformation
  matrixB.copy(mesh.matrixWorld);
  matrixA.copy(root.matrixWorld).invert();
  matrixB.premultiply(matrixA);

  matrixB.decompose(pos, rot, scale);
  // scale.multiply(root.scale)
  return {
    translation: { x: pos.x, y: pos.y, z: pos.z },
    rotation: { x: rot.x, y: rot.y, z: rot.z, w: rot.w },
    scale: { x: scale.x, y: scale.y, z: scale.z },
  };
};

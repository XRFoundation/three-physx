import { Vector3, Matrix4, Mesh, Quaternion, Object3D, SphereGeometry, BufferGeometry } from 'three';
import { BufferGeometryUtils } from 'three/examples/jsm/utils/BufferGeometryUtils';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry';
import { PhysXInstance, Transform } from '../../src';
import { ShapeConfigType, SHAPES, ShapeType } from '../../src/types/ThreePhysX';

const matrixA = new Matrix4();
const matrixB = new Matrix4();
const pos = new Vector3();
const rot = new Quaternion();
const scale = new Vector3(1, 1, 1);

export const getShapesFromObject = (object: any) => {
  const shapes: ShapeType[] = [];
  object.updateMatrixWorld(true);
  iterateGeometries(object, { includeInvisible: true }, (data) => {
    shapes.push(...data);
  });
  return shapes;
};

export const createShapeFromConfig = (shape: ShapeType) => {
  const transform = shape.transform || new Transform();
  const id = PhysXInstance.instance._getNextAvailableShapeID();
  shape.id = id;
  shape.transform = transform;
  shape.config = getShapeConfig(shape.config ?? {});
  return shape;
};

const createShapesFromUserData = (mesh, root): ShapeType[] => {
  if (!mesh.userData.physx) {
    mesh.userData.physx = {};
  }
  const shapes: ShapeType[] = [];
  if (mesh.userData.physx.shapes) {
    const relativeTransform = getTransformRelativeToRoot(mesh, root);
    mesh.userData.physx.shapes.forEach((shape: ShapeType) => {
      const data = getShapeData(mesh, shape);
      if (!data) return;
      const transform = shape.transform || relativeTransform;
      const id = PhysXInstance.instance._getNextAvailableShapeID();
      data.id = id;
      data.transform = transform;
      data.config = getShapeConfig(shape.config ?? {});
      shapes.push(data);
    });
  } else {
    const data = getThreeGeometryShape(mesh);
    if (!data) return [];
    const transform = getTransformRelativeToRoot(mesh, root);
    const id = PhysXInstance.instance._getNextAvailableShapeID();
    data.id = id;
    data.transform = transform;
    data.config = getShapeConfig({});
    shapes.push(data);
  }
  return shapes;
};

// from three-to-ammo
export const iterateGeometries = (function () {
  return function (root, options, cb) {
    root.traverse((mesh: Mesh) => {
      if (mesh.isMesh && (options.includeInvisible || mesh.visible)) {
        cb(createShapesFromUserData(mesh, root));
      }
    });
  };
})();

const getShapeConfig = (config: ShapeConfigType) => {
  return {
    isTrigger: config.isTrigger,
    collisionLayer: config.collisionLayer,
    collisionMask: config.collisionMask,
    material: config.material || {},
  };
};

const getShapeData = (mesh, shape): any => {
  if (!shape.type) {
    return getThreeGeometryShape(mesh);
  }
  switch (shape.type) {
    case SHAPES.Box:
      return {
        shape: shape.type,
        options: { boxExtents: shape.boxExtents || getBoxExtents(mesh) },
      };
    case SHAPES.Capsule:
      return {
        shape: shape.type,
        halfHeight: shape.halfHeight ?? 1,
        radius: shape.radius ?? shape.radiusTop ?? 0.5,
      };
    case SHAPES.Sphere:
      return {
        shape: shape.type,
        options: { radius: shape.sphereRadius || getSphereRadius(mesh) },
      };
    case SHAPES.ConvexMesh:
      const convexGeom = new ConvexGeometry(arrayOfPointsToArrayOfVector3(mesh.geometry.attributes.position.array));
      const vertices = Array.from(convexGeom.attributes.position.array);
      return { shape: shape.type, options: { vertices } };
    case SHAPES.TriangleMesh:
    default: {
      // const vertices = removeDuplicates(Array.from(mesh.geometry.attributes.position.array));
      const vertices = Array.from(mesh.geometry.attributes.position.array);
      const indices = mesh.geometry.index ? Array.from(mesh.geometry.index.array) : Object.keys(vertices).map(Number);
      return { shape: shape.type, options: { vertices, indices } };
    }
  }
};

const getThreeGeometryShape = (mesh): any => {
  if (!mesh.geometry) throw new Error('No geometry defined!');
  if (mesh.geometry instanceof ConvexGeometry) {
    const vertices = Array.from(mesh.geometry.attributes.position.array);
    return { shape: SHAPES.ConvexMesh, options: { vertices } };
  }
  switch (mesh.geometry.type) {
    case 'BoxGeometry':
    case 'BoxBufferGeometry':
      return {
        shape: SHAPES.Box,
        options: { boxExtents: getBoxExtents(mesh) },
      };
    case 'CapsuleBufferGeometry': // https://github.com/maximeq/three-js-capsule-geometry
      return {
        shape: SHAPES.Capsule,
        options: { halfHeight: mesh.geometry._halfHeight ?? 1, radius: mesh.geometry.radius ?? mesh.geometry.radiusTop ?? 0.5 },
      };
    case 'DodecahedronBufferGeometry':
    case 'DodecahedronGeometry':
    case 'OctahedronBufferGeometry':
    case 'OctahedronGeometry':
    case 'IcosahedronBufferGeometry':
    case 'IcosahedronGeometry':
    case 'SphereGeometry':
    case 'SphereBufferGeometry':
      return {
        shape: SHAPES.Sphere,
        options: { radius: getSphereRadius(mesh) },
      };
    default: {
      const vertices = Array.from(mesh.geometry.attributes.position.array);
      const indices = Array.from(mesh.geometry.index?.array ?? mesh.geometry.parameters?.indices ?? []);
      return {
        shape: SHAPES.TriangleMesh,
        options: { vertices, indices },
      };
    }
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
const matrix = new Matrix4();
export const getTransformFromWorldPos = (obj: Object3D) => {
  obj.updateWorldMatrix(true, true);
  obj.matrixWorld.decompose(pos, rot, scale);
  return new Transform({
    translation: pos,
    rotation: rot,
    scale,
  });
};

const getTransformRelativeToRoot = (mesh: Object3D, root: Object3D) => {
  const worldScale = root.getWorldScale(scale);
  // console.log(worldScale)
  // no local transformation
  if (mesh === root) {
    return new Transform({
      scale: worldScale,
    });
  }

  // local transformation
  if (mesh.parent === root) {
    return new Transform({
      translation: mesh.position,
      rotation: mesh.quaternion,
      scale: worldScale,
    });
  }
  mesh.updateMatrixWorld(true);
  mesh.updateWorldMatrix(true, true);

  // world transformation
  matrixB.copy(mesh.matrixWorld);
  matrixA.copy(root.matrixWorld).invert();
  matrixB.premultiply(matrixA);

  // console.log(mesh.getWorldPosition(pos), mesh.getWorldQuaternion(rot), mesh.getWorldScale(pos) )
  matrixB.decompose(pos, rot, scale);
  // scale.multiply(worldScale)
  // console.log(pos, rot, scale)
  return new Transform({
    translation: pos,
    rotation: rot,
    scale,
  });
};

/**
 * Returns a single geometry for the given object. If the object is compound,
 * its geometries are automatically merged.
 * @param {Object3D} object
 * @return {BufferGeometry}
 */
export function getGeometry(object) {
  let mesh,
    tmp = new BufferGeometry();
  const meshes = getMeshes(object);

  if (meshes.length === 0) return null;

  // Apply scale  – it can't easily be applied to a CANNON.Shape later.
  if (meshes.length === 1) {
    const position = new Vector3(),
      quaternion = new Quaternion(),
      scale = new Vector3();
    if (meshes[0].geometry.isBufferGeometry) {
      if (meshes[0].geometry.attributes.position && meshes[0].geometry.attributes.position.itemSize > 2) {
        tmp = meshes[0].geometry;
      }
    } else {
      tmp = meshes[0].geometry.clone();
    }
    //tmp.metadata = meshes[0].geometry.metadata;
    meshes[0].updateMatrixWorld();
    meshes[0].matrixWorld.decompose(position, quaternion, scale);
    return tmp.scale(scale.x, scale.y, scale.z);
  }

  // Recursively merge geometry, preserving local transforms.
  const combined = BufferGeometryUtils.mergeBufferGeometries(meshes.map(mesh => mesh.geometry));

  const matrix = new Matrix4();
  matrix.scale(object.scale);
  combined.applyMatrix4(matrix);
  return combined;
}

function getMeshes(object) {
  const meshes = [];
  object.traverse((o) => {
    if (o.type === 'Mesh' || o.type === 'SkinnedMesh') {
      meshes.push(o);
    }
  });
  return meshes;
}

export const removeDuplicates = (verticesIn: number[]) => {
  const vertices: Vector3[] = [];
  for (let i = 0; i < verticesIn.length; i += 3) {
    const newVec = new Vector3(verticesIn[i], verticesIn[i + 1], verticesIn[i + 2]);
    let exists = false;
    for (const vert of vertices) {
      if (vert.equals(newVec)) {
        exists = true;
      }
    }
    if (!exists) {
      vertices.push(newVec);
    }
  }
  const verticesOut = [];
  vertices.forEach((vert) => {
    verticesOut.push(vert.x, vert.y, vert.z);
  });
  return verticesOut;
};

export const arrayOfPointsToArrayOfVector3 = (points: ArrayLike<number>) => {
  const verts = [];
  for (let i = 0; i < points.length; i += 3) {
    verts.push(new Vector3(points[i], points[i + 1], points[i + 2]));
  }
  return verts;
};

import { Matrix4, Quaternion, Vector3 } from 'three';
import { PhysXBodyTransform, PhysXModelShapes } from './types/ThreePhysX';
import { PhysXManager } from './worker';

const quat1 = new Quaternion();
const quat2 = new Quaternion();
const vec3 = new Vector3();
const zVec = new Vector3(0, 0, 1)
const halfPI = Math.PI / 2

export const getShape = ({ shape, transform, options }): PhysX.PxShape => {
  const geometry = getGeometry({ shape, transform, options });

  const material = PhysXManager.instance.physics.createMaterial(0.2, 0.2, 0.2);
  const flags = new PhysX.PxShapeFlags(PhysX.PxShapeFlag.eSCENE_QUERY_SHAPE.value | PhysX.PxShapeFlag.eSIMULATION_SHAPE.value);

  const newShape = PhysXManager.instance.physics.createShape(geometry, material, false, flags);
  // rotate 90 degrees on Z axis as PhysX capsule extend along X axis not the Y axis
  if(shape === PhysXModelShapes.Capsule) {
    quat1.setFromAxisAngle(zVec, halfPI)
    quat2.set(transform.rotation.x, transform.rotation.y, transform.rotation.z, transform.rotation.w)
    quat2.multiply(quat1);
    transform.rotation = {
      x: quat2.x,
      y: quat2.y,
      z: quat2.z,
      w: quat2.w,
    }
  }
  //@ts-ignore
  newShape.setLocalPose(transform);
  return newShape;
};

const getGeometry = ({ shape, transform, options }): PhysX.PxGeometry => {
  const { boxExtents, radius, vertices, indices, halfHeight } = options || {};
  let geometry: PhysX.PxGeometry;
  if (shape === PhysXModelShapes.Box) {
    geometry = new PhysX.PxBoxGeometry(boxExtents.x, boxExtents.y, boxExtents.z);
  } else if (shape === PhysXModelShapes.Sphere) {
    geometry = new PhysX.PxSphereGeometry(radius);
  } else if (shape === PhysXModelShapes.Capsule) {
    geometry = new PhysX.PxCapsuleGeometry(radius, halfHeight);
  } else if (shape === PhysXModelShapes.Plane) {
    geometry = new PhysX.PxPlaneGeometry();
  } else if (shape === PhysXModelShapes.TriangleMesh) {
    geometry = createTrimesh(transform, PhysXManager.instance.cooking, PhysXManager.instance.physics, vertices, indices);
  }
  return geometry;
};

const createTrimesh = (transform: PhysXBodyTransform, cooking: PhysX.PxCooking, physics: PhysX.PxPhysics, vertices: ArrayLike<number>, indices: ArrayLike<number>): PhysX.PxTriangleMeshGeometry => {
  const verticesPtr = PhysX._malloc(4 * vertices.length);
  let verticesOffset = 0;

  for (let i = 0; i < vertices.length; i++) {
    PhysX.HEAPF32[(verticesPtr + verticesOffset) >> 2] = vertices[i];
    verticesOffset += 4;
  }

  const indicesPtr = PhysX._malloc(4 * indices.length);
  let indicesOffset = 0;

  for (let i = 0; i < indices.length; i++) {
    PhysX.HEAPU32[(indicesPtr + indicesOffset) >> 2] = indices[i];
    indicesOffset += 4;
  }

  const trimesh = cooking.createTriMesh(verticesPtr, vertices.length, indicesPtr, indices.length, false, physics);

  const meshScale = new PhysX.PxMeshScale(
    { x: transform.scale.x, y: transform.scale.y, z: transform.scale.z },
    // { x: 1, y: 1, z: 1 },
    { x: 0, y: 0, z: 0, w: 1 },
  );
  const geometry = new PhysX.PxTriangleMeshGeometry(trimesh, meshScale, new PhysX.PxMeshGeometryFlags(0));

  PhysX._free(verticesPtr);
  PhysX._free(indicesPtr);

  return geometry;
};

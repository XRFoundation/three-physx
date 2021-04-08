import { Matrix4, Quaternion, Vector3 } from 'three';
import { PhysXBodyTransform, PhysXModelShapes } from './types/ThreePhysX';
import { PhysXManager } from './worker';

export const getShape = ({ shape, transform, options }): PhysX.PxShape => {
  const geometry = getGeometry({ shape, transform, options });

  const material = PhysXManager.instance.physics.createMaterial(0.2, 0.2, 0.2);
  const flags = new PhysX.PxShapeFlags(
    PhysX.PxShapeFlag.eSCENE_QUERY_SHAPE.value |
      PhysX.PxShapeFlag.eSIMULATION_SHAPE.value,
  );

  const newShape = PhysXManager.instance.physics.createShape(
    geometry,
    material,
    false,
    flags,
  );
  //@ts-ignore
  newShape.setLocalPose(transform);
  return newShape;
};

const getGeometry = ({ shape, transform, options }): PhysX.PxGeometry => {
  const { boxExtents, sphereRadius, vertices, indices } = options || {};
  let geometry: PhysX.PxGeometry;
  if (shape === PhysXModelShapes.Box) {
    geometry = new PhysX.PxBoxGeometry(
      boxExtents.x,
      boxExtents.y,
      boxExtents.z,
    );
  } else if (shape === PhysXModelShapes.Sphere) {
    geometry = new PhysX.PxSphereGeometry(sphereRadius);
  } else if (shape === PhysXModelShapes.Plane) {
    geometry = new PhysX.PxPlaneGeometry();
  } else if (shape === PhysXModelShapes.TriangleMesh) {
    geometry = createTrimesh(
      transform,
      PhysXManager.instance.cooking,
      PhysXManager.instance.physics,
      vertices,
      indices,
    );
  }
  return geometry;
};

const createTrimesh = (
  transform: PhysXBodyTransform,
  cooking: PhysX.PxCooking,
  physics: PhysX.PxPhysics,
  vertices: ArrayLike<number>,
  indices: ArrayLike<number>,
): PhysX.PxTriangleMeshGeometry => {
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

  const trimesh = cooking.createTriMesh(
    verticesPtr,
    vertices.length,
    indicesPtr,
    indices.length,
    false,
    physics,
  );

  const meshScale = new PhysX.PxMeshScale(
    { x: transform.scale.x, y: transform.scale.y, z: transform.scale.z },
    // { x: 1, y: 1, z: 1 },
    { x: 0, y: 0, z: 0, w: 1 },
  );
  const geometry = new PhysX.PxTriangleMeshGeometry(
    trimesh,
    meshScale,
    new PhysX.PxMeshGeometryFlags(0),
  );

  PhysX._free(verticesPtr);
  PhysX._free(indicesPtr);

  return geometry;
};

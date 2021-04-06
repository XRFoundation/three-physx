import { Object3D, Quaternion, Vector3, Matrix4, BufferGeometry, Box3 } from 'three'
import { PhysXModelShapes, PhysXShapeOptions } from './types/threePhysX'
import { quickhull } from './quickhull';
import { PhysXManager } from './worker';

const PI_2 = Math.PI / 2;

export const threeToPhysX = ({ shape, vertices, indices, matrix, worldMatrix, options }): PhysX.PxShape => {

  const geometry = getGeometry({ shape, vertices, indices, matrix, worldMatrix, options });

  const material = PhysXManager.instance.physics.createMaterial(0.2, 0.2, 0.2);
  const flags = new PhysX.PxShapeFlags(
    PhysX.PxShapeFlag.eSCENE_QUERY_SHAPE.value |
    PhysX.PxShapeFlag.eSIMULATION_SHAPE.value
  );
  console.log(geometry)

  return PhysXManager.instance.physics.createShape(geometry, material, false, flags);
}

const getGeometry = ({ shape, vertices, indices, matrix, worldMatrix, options = {} }): PhysX.PxGeometry => {

  const { boxExtents, sphereRadius } = options as PhysXShapeOptions;

  // TODO: use matrix and worldMatrix to transform child shapes
  if (shape === PhysXModelShapes.Box) {
    return new PhysX.PxBoxGeometry(...boxExtents);
  } else if (shape === PhysXModelShapes.Sphere) {
    return new PhysX.PxSphereGeometry(sphereRadius);
  } else if (shape === PhysXModelShapes.Plane) {
    return new PhysX.PxPlaneGeometry();
  } else if (shape === PhysXModelShapes.TriangleMesh) {
    return createTrimesh(PhysXManager.instance.cooking, PhysXManager.instance.physics, vertices, indices);
  }
}

const createTrimesh = (	
  cooking: PhysX.PxCooking,
	physics: PhysX.PxPhysics,
	vertices: ArrayLike<number>,
	indices: ArrayLike<number>
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

	const trimesh = cooking.createTriMesh(verticesPtr, vertices.length, indicesPtr, indices.length, false, physics);

	const meshScale = new PhysX.PxMeshScale({ x: 1, y: 1, z: 1 }, { x: 0, y: 0, z: 0, w: 1 });
	const geometry = new PhysX.PxTriangleMeshGeometry(trimesh, meshScale, new PhysX.PxMeshGeometryFlags(0));

	PhysX._free(verticesPtr);
	PhysX._free(indicesPtr);

	return geometry;
}

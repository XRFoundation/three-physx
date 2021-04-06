

import { PhysXBodyConfig } from '..'
import { Object3D, Vector3, Matrix4, Box3, Mesh, SphereBufferGeometry } from 'three'
import { PhysXModelShapes, PhysXShapeConfig } from '../src/types/threePhysX';

const transform = new Matrix4();
const inverse = new Matrix4();

//createPhysXBody(entity, id, threeToPhysXModelDescription(entity, { type: threeToPhysXModelDescription.Shape.MESH }), true)
export const createPhysXBody = (object: Object3D, id: number, dynamic: boolean = true) => {
  if(object.parent) {
    inverse.copy(object.parent.matrixWorld).invert();
    transform.multiplyMatrices(inverse, object.matrixWorld);
  }

  const shapes: PhysXShapeConfig[] = [];

  object.updateMatrixWorld(true);
  iterateGeometries(object, { includeInvisible: true }, (data => { shapes.push(data) }));
  
  const physxBodyConfig: PhysXBodyConfig = {
    id,
    worldMatrix: transform.elements,
    shapes,
    bodyOptions: {
      dynamic,
    }
  }
  return physxBodyConfig;
}

// from three-to-ammo
export const iterateGeometries = (function() {
  return function(root, options, cb: (data: PhysXShapeConfig) => void) {
    inverse.copy(root.matrixWorld).invert();
    const scale = new Vector3();
    scale.setFromMatrixScale(root.matrixWorld);
    root.traverse((mesh: Mesh) => {
      const transform = new Matrix4();
      if (
        mesh.isMesh &&
        mesh.name !== "Sky" &&
        (options.includeInvisible || mesh.visible)
      ) {
        if (mesh === root) {
          transform.identity();
        } else {
          mesh.updateWorldMatrix(true, false);
          transform.multiplyMatrices(inverse, mesh.matrixWorld);
        }
        // todo: might want to return null xform if this is the root so that callers can avoid multiplying
        // things by the identity matrix
        const shape = getGeometryShape(mesh);
        const vertices = Array.from(mesh.geometry.attributes.position.array);
        const matrix = transform.elements;
        const indices = Array.from(mesh.geometry.index.array);
        switch(shape) {
          case PhysXModelShapes.Box:
            cb({ shape, options: { boxExtents: getBoxExtents(mesh.geometry) }}); 
            break;
          case PhysXModelShapes.Plane:
            cb({ shape });
            break;
          case PhysXModelShapes.Sphere:
            cb({ shape, options: { sphereRadius: (mesh.geometry as SphereBufferGeometry).parameters.radius } });
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

const getGeometryShape = (mesh): PhysXModelShapes => {

  const type = mesh.metadata?.type || mesh.geometry?.metadata?.type || mesh.geometry.type;
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
}

const getBoxExtents = function(geometry) {
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  return [
    (box.max.x - box.min.x) / 2,
    (box.max.y - box.min.y) / 2,
    (box.max.z - box.min.z) / 2
  ]
}
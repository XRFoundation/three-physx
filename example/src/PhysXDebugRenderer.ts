import { Scene, Mesh, Points, SphereBufferGeometry, BoxBufferGeometry, PlaneBufferGeometry, BufferGeometry, MeshBasicMaterial, Vector3, SphereGeometry, BoxGeometry, PlaneGeometry, Object3D, Matrix4, Quaternion } from 'three';
import { Object3DBody, PhysXBodyType, PhysXModelShapes, PhysXShapeConfig, RigidBodyProxy } from '../../src/types/ThreePhysX';
import { CapsuleBufferGeometry } from './CapsuleBufferGeometry';
const parentMatrix = new Matrix4();
const childMatrix = new Matrix4();
const pos = new Vector3();
const rot = new Quaternion();
const quat = new Quaternion();
const scale = new Vector3(1, 1, 1);
const scale2 = new Vector3(1, 1, 1);
export class PhysXDebugRenderer {
  private scene: Scene;
  private _meshes: Mesh[] | Points[];
  private _materials: MeshBasicMaterial[];
  private _sphereGeometry: SphereBufferGeometry;
  private _boxGeometry: BoxBufferGeometry;
  private _planeGeometry: PlaneBufferGeometry;

  public enabled: boolean;

  constructor(scene: Scene) {
    this.scene = scene;
    this.enabled = false;

    this._meshes = [];

    this._materials = [
      new MeshBasicMaterial({ color: 0xff0000, wireframe: true }),
      new MeshBasicMaterial({ color: 0x00ff00, wireframe: true }),
      new MeshBasicMaterial({ color: 0x00aaff, wireframe: true }),
      new MeshBasicMaterial({ color: 0xffffff, wireframe: true }),
    ];
    this._sphereGeometry = new SphereBufferGeometry(1);
    this._boxGeometry = new BoxBufferGeometry();
    this._planeGeometry = new PlaneBufferGeometry();
  }

  public setEnabled(enabled) {
    this.enabled = enabled;
    if(!enabled) {
      this._meshes.forEach((mesh) => {
        this.scene.remove(mesh);
      })
      this._meshes = [];
    }
  }

  public update(objects: Map<number, Object3D>) {
    if (!this.enabled) {
      return;
    }

    const meshes: Mesh[] | Points[] = this._meshes;

    let meshIndex = 0;
    objects.forEach((object, id) => {
      //@ts-ignore
      const body = object.body as RigidBodyProxy;

      rot.set(body.transform.rotation.x, body.transform.rotation.y, body.transform.rotation.z, body.transform.rotation.w);
      pos.set(body.transform.translation.x, body.transform.translation.y, body.transform.translation.z);
      if(body.options.type === PhysXBodyType.CONTROLLER) {

        this._updateController(object as Object3DBody, meshIndex);
        meshes[meshIndex].position.copy(pos)
        // console.log(body, meshes[meshIndex])
        meshIndex++;
      }
      parentMatrix.compose(pos, rot, scale);

      body.shapes.forEach((shape: PhysXShapeConfig) => {
        this._updateMesh(object as Object3DBody, meshIndex, shape);

        const mesh = meshes[meshIndex];

        if (mesh) {
          // Copy to meshes
          pos.set(shape.transform.translation.x, shape.transform.translation.y, shape.transform.translation.z);
          rot.set(shape.transform.rotation.x, shape.transform.rotation.y, shape.transform.rotation.z, shape.transform.rotation.w);
          childMatrix.compose(pos, rot, scale);
          childMatrix.premultiply(parentMatrix);
          childMatrix.decompose(pos, rot, scale2);
          mesh.position.copy(pos);
          mesh.quaternion.copy(rot);
        }

        meshIndex++;
      });
    });
    for (let i = meshIndex; i < meshes.length; i++) {
      const mesh: Mesh | Points = meshes[i];
      if (mesh) {
        this.scene.remove(mesh);
      }
    }
    meshes.length = meshIndex;
  }

  private _updateController(root: Object3DBody, index: number) {
    const { config } = root.body.controller;
    let mesh = this._meshes[index];
    if (!mesh) {
      mesh = this._meshes[index] = new Mesh(new CapsuleBufferGeometry(config.radius, config.radius, config.height), this._materials[PhysXBodyType.CONTROLLER])
      this.scene.add(mesh);
    }
  }

  private _updateMesh(root: Object3DBody, index: number, shape: PhysXShapeConfig) {
    let mesh = this._meshes[index];
    if (!this._typeMatch(mesh, shape)) {
      if (mesh) {
        this.scene.remove(mesh);
      }
      mesh = this._meshes[index] = this._createMesh(shape, root.body.options.type);
    }
    this._scaleMesh(root, mesh, shape);
  }

  private _typeMatch(mesh: Mesh | Points, shape: PhysXShapeConfig): Boolean {
    if (!mesh) {
      return false;
    }
    return (
      shape.shape === PhysXModelShapes.Sphere ||
      shape.shape === PhysXModelShapes.Box ||
      shape.shape === PhysXModelShapes.Plane ||
      shape.shape === PhysXModelShapes.ConvexMesh ||
      shape.shape === PhysXModelShapes.TriangleMesh ||
      shape.shape === PhysXModelShapes.HeightField
    );
  }

  private _createMesh(shape: PhysXShapeConfig, type: PhysXBodyType): Mesh | Points {
    let mesh: Mesh | Points;
    let geometry: BufferGeometry;
    const material: MeshBasicMaterial = this._materials[type];
    let points: Vector3[] = [];

    switch (shape.shape) {
      case PhysXModelShapes.Sphere:
        mesh = new Mesh(this._sphereGeometry, material);
        break;

      case PhysXModelShapes.Capsule:
        mesh = new Mesh(new CapsuleBufferGeometry(shape.options.capsuleRadius, shape.options.capsuleRadius, shape.options.capsuleHeight), material);
        break;
  
      case PhysXModelShapes.Box:
        mesh = new Mesh(this._boxGeometry, material);
        break;

      case PhysXModelShapes.Plane:
        mesh = new Mesh(this._planeGeometry, material);
        break;

      case PhysXModelShapes.ConvexMesh:
        geometry = new BufferGeometry();
        points = [];
        for (let i = 0; i < shape.options.vertices.length; i += 3) {
          const [x, y, z] = [shape.options.vertices[i], shape.options.vertices[i + 1], shape.options.vertices[i + 2]];
          points.push(new Vector3(x, y, z));
        }
        geometry.setFromPoints(points);
        mesh = new Mesh(geometry, material);

        //highlight faces that the CONVEXPOLYHEDRON thinks are pointing into the shape.
        // geometry.faces.forEach(f => {
        //     const n = f.normal
        //     n.negate();
        //     f.normal = n
        //     const v1 = geometry.vertices[f.a]
        //     if (n.dot(v1) > 0) {
        //         const v2 = geometry.vertices[f.b]
        //         const v3 = geometry.vertices[f.c]

        //         const p = new Vector3();
        //         p.x = (v1.x + v2.x + v3.x) / 3;
        //         p.y = (v1.y + v2.y + v3.y) / 3;
        //         p.z = (v1.z + v2.z + v3.z) / 3;

        //         const g = new Geometry();
        //         g.vertices.push(v1, v2, v3)
        //         g.faces.push(new Face3(0, 1, 2));
        //         g.computeFaceNormals();
        //         const m = new Mesh(g, new MeshBasicMaterial({ color: 0xff0000 }));
        //         mesh.add(m)
        //     }
        // });
        break;

      case PhysXModelShapes.TriangleMesh:
        geometry = new BufferGeometry();
        points = [];
        for (let i = 0; i < shape.options.vertices.length; i += 3) {
          points.push(new Vector3(shape.options.vertices[i], shape.options.vertices[i + 1], shape.options.vertices[i + 2]));
        }
        geometry.setFromPoints(points);
        geometry.setIndex(Array.from(shape.options.indices));
        mesh = new Mesh(geometry, material);
        break;

      // case Shape.types.HEIGHTFIELD:
      //   geometry = new BufferGeometry();

      //   v0 = this.tmpVec0
      //   v1 = this.tmpVec1
      //   v2 = this.tmpVec2
      //   for (let xi = 0; xi < (shape as Heightfield).data.length - 1; xi++) {
      //     for (let yi = 0; yi < (shape as Heightfield).data[xi].length - 1; yi++) {
      //       for (let k = 0; k < 2; k++) {
      //         (shape as Heightfield).getConvexTrianglePillar(xi, yi, k === 0)
      //         v0.copy((shape as Heightfield).pillarConvex.vertices[0])
      //         v1.copy((shape as Heightfield).pillarConvex.vertices[1])
      //         v2.copy((shape as Heightfield).pillarConvex.vertices[2])
      //         v0.vadd((shape as Heightfield).pillarOffset, v0)
      //         v1.vadd((shape as Heightfield).pillarOffset, v1)
      //         v2.vadd((shape as Heightfield).pillarOffset, v2)
      //         points.push(
      //           new Vector3(v0.x, v0.y, v0.z),
      //           new Vector3(v1.x, v1.y, v1.z),
      //           new Vector3(v2.x, v2.y, v2.z)
      //         );
      //         //const i = geometry.vertices.length - 3
      //         //geometry.faces.push(new Face3(i, i + 1, i + 2))
      //       }
      //     }
      //   }
      //   geometry.setFromPoints(points)
      //   //geometry.computeBoundingSphere()
      //   //geometry.computeFaceNormals()
      //   mesh = new Mesh(geometry, material)
      //   break;
      default:
        mesh = new Mesh();
        break;
    }

    if (mesh && mesh.geometry) {
      this.scene.add(mesh);
    }

    return mesh;
  }

  private _scaleMesh(root: Object3DBody, mesh: Mesh | Points, shape: PhysXShapeConfig) {
    const scale = shape.transform.scale as Vector3;
    switch (shape.shape) {
      case PhysXModelShapes.Sphere:
        const radius = shape.options.sphereRadius;
        mesh.scale.multiplyScalar(radius);
        break;

      case PhysXModelShapes.Box:
        const { x, y, z } = shape.options.boxExtents;
        mesh.scale.set(x, y, z).multiplyScalar(2);
        break;

      default:
        mesh.scale.copy(scale);
        break;
    }
  }
}

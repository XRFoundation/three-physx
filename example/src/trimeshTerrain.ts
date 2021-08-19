import * as THREE from 'three'
import { BufferAttribute, BufferGeometry, Group, Mesh, MeshStandardMaterial, Vector3 } from 'three';
import { ImprovedNoise } from 'three/examples/jsm/math/ImprovedNoise.js'

export default class Terrain {
  
  grid_size = 32;
  grid_scale = 1;
  grid_height = 1
  mesh: Mesh;

  constructor() {

    const meshMaterial = new MeshStandardMaterial({ color: 0x00ff00 })
    const geometry = new BufferGeometry();
    const vertices = [];
    const indices = [];
    let index = 0;
    const width = this.grid_size
    const height = this.grid_size
    const data = this.generateHeight(this.grid_size, this.grid_size, 0.25);

    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        vertices.push(
          x * this.grid_scale,
          data[index] * this.grid_height ,
          // 0,
          y * this.grid_scale
        )
        if (x < width - 1 && y < height - 1) {
          indices.push(index, index + width + 1, index + width)
          indices.push(index + width + 1, index, index + 1)
        }
        index++;
      }
    }

    geometry.setAttribute('position', new BufferAttribute(new Float32Array(vertices), 3));
    geometry.setIndex(indices);
    geometry.computeVertexNormals()

    this.mesh = new Mesh(geometry, meshMaterial);
    this.mesh.position.set(-this.grid_scale * this.grid_size * 0.5, -2, -this.grid_scale * this.grid_size * 0.5)
  }

  generateHeight(width, length, heightScale) {
    const size = width * length
    let data = new Uint8Array(size)
    let perlin = new ImprovedNoise()
    let quality = 1
    let z = 0//Math.random() * 10;
    for (let j = 0; j < 4; j++) {
      for (let i = 0; i < size; i++) {
        const x = i % width, y = ~ ~(i / width);
        data[i] += Math.abs(perlin.noise(x / quality, y / quality, z) * quality * 1.75 * heightScale);
      }
      quality *= 3;
    }
    return data;
  }
}
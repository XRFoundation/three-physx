import * as THREE from 'three'
import { Object3D } from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'

const container = document.createElement('div')
container.style.position = 'fixed'
container.style.top = '0'
container.style.left = '0'
container.style.right = '0'
container.style.bottom = '0'
document.body.appendChild(container)

const scene = new THREE.Scene()
scene.background = new THREE.Color('white')

const dirLight = new THREE.DirectionalLight('white', 0.8)
dirLight.position.set(-1, 1.75, 1)
dirLight.position.multiplyScalar(30)
dirLight.castShadow = true
dirLight.shadow.mapSize.width = 1024
dirLight.shadow.mapSize.height = 1024
scene.add(dirLight)

const light = new THREE.AmbientLight('white', 0.3)
scene.add(light)

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.fromArray([
  -0.4013406342550598,
  7.44362999004455,
  11.24080658033156,
])
camera.quaternion.fromArray([
  -0.28811373671368645,
  -0.017086547783363,
  -0.005141753910019259,
  0.9574299384124418,
])

const renderer = new THREE.WebGLRenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.shadowMap.enabled = true

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.screenSpacePanning = false
controls.minDistance = 1
controls.maxDistance = 500
controls.maxPolarAngle = Math.PI / 2

container.appendChild(renderer.domElement)

const meshes = {}

export const init = (entities: Map<number, Object3D>) => {
  entities.forEach((entity, id) => {
    entity.castShadow = true
    entity.receiveShadow = true
    meshes[id] = entity
    scene.add(entity)
  })
}

export const update = (entities: Map<number, Object3D>) => {
  // entities.forEach((entity, id) => {
  //   const mesh = meshes[id]
  // })
  controls.update()
  renderer.render(scene, camera)
}
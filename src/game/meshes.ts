import * as THREE from "three"
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js"

// P1=green, P2=red, P3=blue, P4=purple
const GHOST_COLORS = [0x00ff88, 0xff6644, 0x44aaff, 0x9966ff] as const

// P1=wisp, P2=spark, P3=classic, P4=wraith
export const CHARACTER_MODELS = [
  "/models/wisp.glb",
  "/models/spark.glb",
  "/models/classic.glb",
  "/models/wraith.glb",
] as const

export type CharacterIndex = 0 | 1 | 2 | 3

export { GHOST_COLORS }

export interface LoadCharacterOptions {
  /** target size for largest dimension (default 0.6 for AR) */
  targetSize?: number
  /** rotate model around Y in radians (e.g. Math.PI to face -Z) */
  rotateY?: number
}

const modelCache = new Map<string, THREE.Group>()

/** loads a character GLB, scaled. preserves baked-in textures. cached per path+options. */
export async function loadCharacterModel(
  modelPath: string,
  _color?: number,
  options: LoadCharacterOptions = {}
): Promise<THREE.Group> {
  const { targetSize = 0.6, rotateY = 0 } = options
  const cacheKey = `${modelPath}-${targetSize}-${rotateY}`
  const cached = modelCache.get(cacheKey)
  if (cached) return cached.clone(true)

  const loader = new GLTFLoader()
  const gltf = await loader.loadAsync(modelPath)
  const model = gltf.scene

  let box = new THREE.Box3().setFromObject(model)
  const size = new THREE.Vector3()
  box.getSize(size)
  const maxDim = Math.max(size.x, size.y, size.z, 0.001)
  const scale = targetSize / maxDim
  model.scale.setScalar(scale)
  if (rotateY !== 0) model.rotation.y = rotateY
  box = new THREE.Box3().setFromObject(model)
  model.position.y = -box.min.y + 0.02 // base at y=0, slight lift to avoid z-fight

  const group = new THREE.Group()
  group.add(model)
  modelCache.set(cacheKey, group)
  return group
}

/** creates a glowing ghost sphere (fallback for non-AR screens) */
export function createGhostGroup(
  color: number,
  radius = 0.3
): THREE.Group {
  const group = new THREE.Group()
  const geometry = new THREE.SphereGeometry(radius, 16, 16)
  const material = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: 0.8,
    transparent: true,
    opacity: 0.9,
  })
  const sphere = new THREE.Mesh(geometry, material)
  sphere.position.y = radius + 0.1
  group.add(sphere)
  return group
}

/** creates a pool of obstacle box meshes */
export function createObstaclePool(
  scene: THREE.Scene,
  count = 30,
  color = 0x888888
): THREE.Mesh[] {
  const geometry = new THREE.BoxGeometry(2, 2, 2)
  const material = new THREE.MeshStandardMaterial({ color })
  const meshes: THREE.Mesh[] = []
  for (let i = 0; i < count; i++) {
    const mesh = new THREE.Mesh(geometry, material)
    mesh.visible = false
    scene.add(mesh)
    meshes.push(mesh)
  }
  return meshes
}

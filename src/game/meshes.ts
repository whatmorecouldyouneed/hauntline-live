import * as THREE from "three"

// TODO: replace with GLB models via Meshy

const GHOST_COLORS = [0x00ff88, 0xff6644, 0x44aaff, 0xffcc00] as const

export { GHOST_COLORS }

/** creates a glowing ghost sphere (or group for future GLB swap) */
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

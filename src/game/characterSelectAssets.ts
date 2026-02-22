import * as THREE from "three"
import { loadCharacterModel, CHARACTER_MODELS, GHOST_COLORS } from "./meshes"
import type { CharacterIndex } from "./meshes"

let bgTextureCache: THREE.Texture | null = null

/** returns cached background texture, loads once and reuses for app lifetime */
export async function getBackgroundTexture(): Promise<THREE.Texture> {
  if (bgTextureCache) return bgTextureCache
  const tex = await new Promise<THREE.Texture>((resolve, reject) => {
    new THREE.TextureLoader().load("/cyber-background.png", resolve, undefined, reject)
  })
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping
  bgTextureCache = tex
  return tex
}

const CHAR_VIEWER_OPTS = { targetSize: 1.2, rotateY: 0 }

/** warms caches for character select; call when user reaches mode select */
export function preloadCharacterSelectAssets(): void {
  getBackgroundTexture().catch(() => {})
  for (let i = 0; i < CHARACTER_MODELS.length; i++) {
    loadCharacterModel(CHARACTER_MODELS[i], GHOST_COLORS[i as CharacterIndex], CHAR_VIEWER_OPTS).catch(
      () => {}
    )
  }
}

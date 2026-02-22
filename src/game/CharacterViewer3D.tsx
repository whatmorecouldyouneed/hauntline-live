import { useEffect, useRef } from "react"
import * as THREE from "three"
import { loadCharacterModel, CHARACTER_MODELS, GHOST_COLORS } from "./meshes"
import { getBackgroundTexture } from "./characterSelectAssets"
import type { CharacterIndex } from "./meshes"

interface CharacterViewer3DProps {
  characterIndex: CharacterIndex
  onReady?: () => void
}

function disposeGhostGroup(group: THREE.Group): void {
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.geometry?.dispose()
      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => m.dispose())
      } else {
        obj.material?.dispose()
      }
    }
  })
}

function applyEmissiveForDarkCharacter(group: THREE.Group, characterIndex: CharacterIndex): void {
  const isDarker = characterIndex === 1 || characterIndex === 3
  if (!isDarker) return
  const color = GHOST_COLORS[characterIndex]
  group.traverse((obj) => {
    if (obj instanceof THREE.Mesh && obj.material) {
      const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
      for (const m of mats) {
        if (m instanceof THREE.MeshStandardMaterial) {
          m.emissive = new THREE.Color(color)
          m.emissiveIntensity = 0.12
        }
      }
    }
  })
}

export function CharacterViewer3D({ characterIndex, onReady }: CharacterViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const characterIndexRef = useRef(characterIndex)
  characterIndexRef.current = characterIndex

  const stateRef = useRef<{
    scene: THREE.Scene | null
    ghostGroup: THREE.Group | null
    currentCharacterIndex: CharacterIndex | null
    renderer: THREE.WebGLRenderer | null
    camera: THREE.PerspectiveCamera | null
    frameId: number | undefined
    handleResize: (() => void) | undefined
    container: HTMLDivElement | null
  }>({
    scene: null,
    ghostGroup: null,
    currentCharacterIndex: null,
    renderer: null,
    camera: null,
    frameId: undefined,
    handleResize: undefined,
    container: null,
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    const state = stateRef.current
    state.container = container

    const init = async () => {
      const [bgTex, initialGhost] = await Promise.all([
        getBackgroundTexture(),
        loadCharacterModel(
          CHARACTER_MODELS[characterIndexRef.current],
          GHOST_COLORS[characterIndexRef.current],
          { targetSize: 1.2, rotateY: 0 }
        ),
      ])
      if (cancelled) return

      const aspect = container.clientWidth / container.clientHeight
      THREE.TextureUtils.cover(bgTex, aspect)

      const scene = new THREE.Scene()
      scene.background = bgTex
      state.scene = scene

      applyEmissiveForDarkCharacter(initialGhost, characterIndexRef.current)
      initialGhost.position.set(0, 0.5, 0)
      scene.add(initialGhost)
      state.ghostGroup = initialGhost
      state.currentCharacterIndex = characterIndexRef.current

      const camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        100
      )
      const box = new THREE.Box3().setFromObject(initialGhost)
      const center = new THREE.Vector3()
      box.getCenter(center)
      camera.position.set(0, center.y, 3)
      camera.lookAt(center)
      state.camera = camera

      const isDarker = characterIndexRef.current === 1 || characterIndexRef.current === 3
      scene.add(new THREE.AmbientLight(0xffffff, isDarker ? 1.2 : 0.6))
      const dirLight = new THREE.DirectionalLight(0xffffff, isDarker ? 1.4 : 0.8)
      dirLight.position.set(2, 10, 5)
      scene.add(dirLight)
      if (isDarker) {
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.9)
        fillLight.position.set(0, 0, 5)
        scene.add(fillLight)
      }

      const renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      container.appendChild(renderer.domElement)
      state.renderer = renderer

      const animate = () => {
        state.frameId = requestAnimationFrame(animate)
        if (state.ghostGroup && !cancelled) {
          state.ghostGroup.rotation.y += 0.005
        }
        if (state.renderer && state.scene && state.camera) {
          state.renderer.render(state.scene, state.camera)
        }
      }

      const handleResize = () => {
        if (!container || !state.camera || !state.renderer) return
        const newAspect = container.clientWidth / container.clientHeight
        state.camera.aspect = newAspect
        state.camera.updateProjectionMatrix()
        state.renderer.setSize(container.clientWidth, container.clientHeight)
        if (state.scene?.background instanceof THREE.Texture) {
          THREE.TextureUtils.cover(state.scene.background, newAspect)
        }
      }
      state.handleResize = handleResize
      window.addEventListener("resize", handleResize)

      animate()
      onReady?.()
    }

    init()

    return () => {
      cancelled = true
      if (state.frameId !== undefined) cancelAnimationFrame(state.frameId)
      if (state.handleResize) window.removeEventListener("resize", state.handleResize)
      if (state.ghostGroup && state.scene) {
        state.scene.remove(state.ghostGroup)
        disposeGhostGroup(state.ghostGroup)
      }
      if (state.renderer) {
        state.renderer.domElement.remove()
        state.renderer.dispose()
      }
      state.scene = null
      state.ghostGroup = null
      state.currentCharacterIndex = null
      state.renderer = null
      state.camera = null
      state.container = null
    }
  }, [onReady])

  useEffect(() => {
    const state = stateRef.current
    if (!state.scene) return
    if (state.currentCharacterIndex === characterIndex) return

    const swapGhost = async () => {
      const idx = characterIndexRef.current
      if (state.ghostGroup && state.scene) {
        state.scene.remove(state.ghostGroup)
        disposeGhostGroup(state.ghostGroup)
        state.ghostGroup = null
      }
      const ghost = await loadCharacterModel(CHARACTER_MODELS[idx], GHOST_COLORS[idx], {
        targetSize: 1.2,
        rotateY: 0,
      })
      if (!state.scene) return
      applyEmissiveForDarkCharacter(ghost, idx)
      ghost.position.set(0, 0.5, 0)
      state.ghostGroup = ghost
      state.currentCharacterIndex = idx
      state.scene.add(ghost)

      const box = new THREE.Box3().setFromObject(ghost)
      const center = new THREE.Vector3()
      box.getCenter(center)
      if (state.camera) {
        state.camera.position.set(0, center.y, 3)
        state.camera.lookAt(center)
      }
    }

    swapGhost()
  }, [characterIndex])

  return <div ref={containerRef} className="character-viewer-3d" />
}

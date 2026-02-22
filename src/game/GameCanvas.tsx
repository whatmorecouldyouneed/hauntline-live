import { useEffect, useRef } from "react"
import * as THREE from "three"
import { RunnerEngine } from "./engine/RunnerEngine"
import {
  loadCharacterModel,
  CHARACTER_MODELS,
  GHOST_COLORS,
  createObstaclePool,
} from "./meshes"
import type { CharacterIndex } from "./meshes"

interface GameCanvasProps {
  onDeath: (elapsed: number) => void
  onElapsed?: (elapsed: number) => void
  characterIndex?: CharacterIndex
}

export function GameCanvas({ onDeath, onElapsed, characterIndex = 0 }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let frameId: number | undefined
    let renderer: THREE.WebGLRenderer | undefined
    let camera: THREE.PerspectiveCamera | undefined
    let groundGeometry: THREE.PlaneGeometry | undefined
    let groundMaterial: THREE.MeshStandardMaterial | undefined
    let trackGeometry: THREE.PlaneGeometry | undefined
    let trackMaterial: THREE.MeshBasicMaterial | undefined
    let handleResize: (() => void) | undefined
    let handleTap: (() => void) | undefined

    const init = async () => {
      // single player: compact so obstacles stay visible, face -Z
      const ghostGroup = await loadCharacterModel(
        CHARACTER_MODELS[characterIndex],
        GHOST_COLORS[0],
        { targetSize: 0.65, rotateY: Math.PI }
      )
      if (cancelled) return

      const engine = new RunnerEngine()

      const scene = new THREE.Scene()
      scene.background = new THREE.Color(0x0a0a0a)
      scene.fog = new THREE.Fog(0x0a0a0a, 5, 60)

      camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        100
      )
      const PLAYER_Z = 6 // closer to camera to fill bottom of screen
      camera.position.set(0, 1.5, 10)
      camera.lookAt(0, 0.3, 2)

      renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      container.appendChild(renderer.domElement)

      ghostGroup.position.z = PLAYER_Z
      scene.add(ghostGroup)

      // track: only scrolling segments (no overlap at junction)
      const trackColor = GHOST_COLORS[characterIndex]
      const SEGMENT_LENGTH = 18
      const NUM_TRACK_SEGMENTS = 6
      const trackSegments: THREE.Mesh[] = []
      trackGeometry = new THREE.PlaneGeometry(0.5, SEGMENT_LENGTH)
      trackMaterial = new THREE.MeshBasicMaterial({
        color: trackColor,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
      })
      for (let i = 0; i < NUM_TRACK_SEGMENTS; i++) {
        const seg = new THREE.Mesh(trackGeometry!, trackMaterial!)
        seg.rotation.x = -Math.PI / 2
        seg.position.set(0, 0.01, PLAYER_Z - SEGMENT_LENGTH / 2 - i * SEGMENT_LENGTH)
        trackSegments.push(seg)
        scene.add(seg)
      }

      // ground plane
      groundGeometry = new THREE.PlaneGeometry(20, 200, 1, 1)
      groundMaterial = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      side: THREE.DoubleSide,
    })
      const ground = new THREE.Mesh(groundGeometry, groundMaterial)
      ground.rotation.x = -Math.PI / 2
      ground.position.z = -50
      scene.add(ground)

      scene.add(new THREE.AmbientLight(0xffffff, 0.6))
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
      dirLight.position.set(2, 10, 5)
      scene.add(dirLight)

      const obstacleMeshes = createObstaclePool(scene)

      let lastTime = performance.now()

      const animate = () => {
      frameId = requestAnimationFrame(animate)
      const now = performance.now()
      const dt = (now - lastTime) / 1000
      lastTime = now

      engine.update(dt)
      const state = engine.getState()

      // sync ghost position (closer to camera)
      ghostGroup.position.y = state.playerY
      ghostGroup.position.z = PLAYER_Z

      // scroll track toward player; wrap when segment passes player (no overlap)
      for (const seg of trackSegments) {
        seg.position.z += state.speed * dt
        const trailingEdge = seg.position.z - SEGMENT_LENGTH / 2
        if (trailingEdge > PLAYER_Z) {
          const backZ = Math.min(...trackSegments.map((s) => s.position.z))
          seg.position.z = backZ - SEGMENT_LENGTH
        }
      }

      // sync obstacle meshes (shift to match player z)
      for (let i = 0; i < obstacleMeshes.length; i++) {
        const mesh = obstacleMeshes[i]
        const obs = state.obstacles[i]
        if (obs) {
          mesh.position.set(obs.x, obs.height / 2, obs.z + PLAYER_Z)
          mesh.scale.set(obs.width / 2, obs.height / 2, obs.depth / 2)
          mesh.visible = true
        } else {
          mesh.visible = false
        }
      }

      onElapsed?.(state.elapsed)

      if (!state.alive) {
        cancelAnimationFrame(frameId)
        onDeath(state.elapsed)
        return
      }

      if (renderer && camera) renderer.render(scene, camera)
      }

      handleTap = () => engine.jump()
      container.addEventListener("touchstart", handleTap, { passive: true })
      container.addEventListener("pointerdown", handleTap)

      handleResize = () => {
        if (!container || !camera || !renderer) return
        camera.aspect = container.clientWidth / container.clientHeight
        camera.updateProjectionMatrix()
        renderer.setSize(container.clientWidth, container.clientHeight)
      }
      window.addEventListener("resize", handleResize)

      animate()
    }

    init()

    return () => {
      cancelled = true
      if (frameId !== undefined) cancelAnimationFrame(frameId)
      if (handleResize) window.removeEventListener("resize", handleResize)
      if (handleTap) {
        container.removeEventListener("touchstart", handleTap)
        container.removeEventListener("pointerdown", handleTap)
      }
      if (renderer) {
        renderer.domElement.remove()
        renderer.dispose()
      }
      groundGeometry?.dispose()
      groundMaterial?.dispose()
      trackGeometry?.dispose()
      trackMaterial?.dispose()
    }
  }, [onDeath, onElapsed, characterIndex])

  return <div ref={containerRef} className="game-canvas" />
}

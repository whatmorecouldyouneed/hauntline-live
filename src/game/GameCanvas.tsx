import { useCallback, useEffect, useRef } from "react"
import * as THREE from "three"
import { useWebHaptics } from "web-haptics/react"
import { RunnerEngine } from "./engine/RunnerEngine"
import { playTap, playDeath } from "../utils/audio"
import { getBackgroundTexture } from "./characterSelectAssets"
import {
  loadCharacterModel,
  CHARACTER_MODELS,
  GHOST_COLORS,
  createObstaclePool,
} from "./meshes"
import {
  clamp01,
  getIntroAnimState,
  jumpArc,
  INTRO_DURATION_MS,
} from "./introAnim"
import type { CharacterIndex } from "./meshes"

const PLAYER_Z = 6

interface GameCanvasProps {
  onDeath: (elapsed: number) => void
  onElapsed?: (elapsed: number) => void
  characterIndex?: CharacterIndex
  started?: boolean
  introNonce?: number
  introStartMs?: number
}

export function GameCanvas({
  onDeath,
  onElapsed,
  characterIndex = 0,
  started = true,
  introNonce: _introNonce = 0,
  introStartMs = 0,
}: GameCanvasProps) {
  const { trigger } = useWebHaptics()
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<RunnerEngine | null>(null)
  const startedRef = useRef(started)
  const introStartMsRef = useRef(introStartMs)
  introStartMsRef.current = introStartMs
  startedRef.current = started

  // match haptics.lochie.me: onClick + trigger() default. pointerdown can break the
  // library’s click-based fallback when navigator.vibrate is missing (e.g. ios safari).
  const onGameCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (e.button !== 0) return
      if (!startedRef.current) return
      const engine = engineRef.current
      if (!engine?.alive) return
      console.log("[haptics] game canvas: jump tap → trigger() default")
      void trigger()
      engine.jump()
      playTap()
    },
    [trigger]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let frameId: number | undefined
    let renderer: THREE.WebGLRenderer | undefined
    let camera: THREE.PerspectiveCamera | undefined
    let groundGeometry: THREE.PlaneGeometry | undefined
    let groundMaterial: THREE.MeshStandardMaterial | undefined
    let trackGeometry: THREE.BufferGeometry | undefined
    let trackMaterial: THREE.MeshBasicMaterial | undefined
    let handleResize: (() => void) | undefined
    let bgTex: THREE.Texture | undefined

    const init = async () => {
      bgTex = await getBackgroundTexture()
      if (cancelled) return

      const aspect = container.clientWidth / container.clientHeight
      THREE.TextureUtils.cover(bgTex, aspect)
      // single player: compact so obstacles stay visible, face -Z
      const ghostGroup = await loadCharacterModel(
        CHARACTER_MODELS[characterIndex],
        GHOST_COLORS[0],
        { targetSize: 0.65, rotateY: Math.PI }
      )
      if (cancelled) return

      const isDarkerCharacter = characterIndex === 1 || characterIndex === 3
      if (isDarkerCharacter) {
        const color = GHOST_COLORS[characterIndex]
        ghostGroup.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.material) {
            const mats = Array.isArray(obj.material) ? obj.material : [obj.material]
            for (const m of mats) {
              if (m instanceof THREE.MeshStandardMaterial) {
                m.emissive = new THREE.Color(color)
                m.emissiveIntensity = 0.15
              }
            }
          }
        })
      }

      const engine = new RunnerEngine()
      engineRef.current = engine

      const scene = new THREE.Scene()
      scene.background = bgTex
      scene.fog = new THREE.Fog(0x0a0a0a, 5, 60)

      camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        100
      )
      camera.position.set(0, 1.5, 10)
      camera.lookAt(0, 0.3, 2)

      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      container.appendChild(renderer.domElement)

      scene.add(ghostGroup)

      // track: cylinder segments with overlap
      const trackColor = GHOST_COLORS[characterIndex]
      const SEGMENT_LENGTH = 18
      const SEGMENT_OVERLAP = 2.3                                                                                                                                                                       
      const NUM_TRACK_SEGMENTS = 6
      const trackRadius = 0.125
      const trackSegments: THREE.Mesh[] = []
      trackGeometry = new THREE.CylinderGeometry(
        trackRadius,
        trackRadius,
        SEGMENT_LENGTH,
        12,
        1,
        false
      )
      trackGeometry.rotateX(-Math.PI / 2)
      trackMaterial = new THREE.MeshBasicMaterial({
        color: trackColor,
        side: THREE.DoubleSide,
        depthWrite: true,
        depthTest: true,
      })
      for (let i = 0; i < NUM_TRACK_SEGMENTS; i++) {
        const seg = new THREE.Mesh(trackGeometry!, trackMaterial!)
        seg.position.set(0, -0.03, PLAYER_Z - SEGMENT_LENGTH / 2 - i * (SEGMENT_LENGTH - SEGMENT_OVERLAP))
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

      scene.add(new THREE.AmbientLight(0xffffff, isDarkerCharacter ? 0.9 : 0.6))
      const dirLight = new THREE.DirectionalLight(0xffffff, isDarkerCharacter ? 1.1 : 0.8)
      dirLight.position.set(2, 10, 5)
      scene.add(dirLight)

      const obstacleMeshes = createObstaclePool(scene, 30, GHOST_COLORS[characterIndex])

      let lastTime = performance.now()

      const startZ = PLAYER_Z + 1.2
      // model has rotateY: Math.PI (faces -Z/obstacles); group rotation adds on top. start facing camera, end at 0 = obstacles
      const startRotY = Math.PI
      const faceRotY = 0

      const animate = () => {
      frameId = requestAnimationFrame(animate)
      const now = performance.now()
      const dt = (now - lastTime) / 1000
      lastTime = now

      if (!startedRef.current) {
        const introMs = introStartMsRef.current
        const t = clamp01((now - introMs) / INTRO_DURATION_MS)
        const { faceP, spinP, jumpP, slideP } = getIntroAnimState(t)
        const jumpHeight = 0.25
        if (t >= 1) {
          ghostGroup.rotation.y = faceRotY
          ghostGroup.position.set(0, 0.08, PLAYER_Z)
        } else {
          ghostGroup.rotation.y = startRotY + (faceRotY - startRotY) * faceP - spinP * Math.PI * 2
          ghostGroup.position.x = 0
          ghostGroup.position.y = 0.08 + jumpHeight * jumpArc(jumpP)
          ghostGroup.position.z = startZ + (PLAYER_Z - startZ) * slideP
        }
        if (renderer && camera) renderer.render(scene, camera)
        return
      }
      engine.update(dt)
      const state = engine.getState()

      // sync ghost position (closer to camera, lifted above track to avoid clipping)
      ghostGroup.position.y = state.playerY + 0.08
      ghostGroup.position.z = PLAYER_Z

      // scroll track toward player; wrap when segment passes player
      for (const seg of trackSegments) {
        seg.position.z += state.speed * dt
        const trailingEdge = seg.position.z - SEGMENT_LENGTH / 2
        if (trailingEdge > PLAYER_Z) {
          const backZ = Math.min(...trackSegments.map((s) => s.position.z))
          seg.position.z = backZ - (SEGMENT_LENGTH - SEGMENT_OVERLAP)
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
        playDeath()
        cancelAnimationFrame(frameId)
        onDeath(state.elapsed)
        return
      }

      if (renderer && camera) renderer.render(scene, camera)
      }

      handleResize = () => {
        if (!container || !camera || !renderer) return
        const newAspect = container.clientWidth / container.clientHeight
        camera.aspect = newAspect
        camera.updateProjectionMatrix()
        renderer.setSize(container.clientWidth, container.clientHeight)
        if (bgTex) THREE.TextureUtils.cover(bgTex, newAspect)
      }
      window.addEventListener("resize", handleResize)

      animate()
    }

    init()

    return () => {
      cancelled = true
      engineRef.current = null
      if (frameId !== undefined) cancelAnimationFrame(frameId)
      if (handleResize) window.removeEventListener("resize", handleResize)
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

  return (
    <div
      ref={containerRef}
      className="game-canvas"
      onClick={onGameCanvasClick}
    />
  )
}

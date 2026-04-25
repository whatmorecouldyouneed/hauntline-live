import { useEffect, useRef } from "react"
import * as THREE from "three"
import { MindARThree } from "mind-ar/dist/mindar-image-three.prod.js"
import { useWebHaptics } from "web-haptics/react"
import { RunnerEngine } from "./engine/RunnerEngine"
import { createGhostGroup } from "./meshes"
import { GHOST_COLORS } from "./meshes"

const TARGET_MIND_SRC = "/markers/player-one.mind"

// TODO: bump to 4 when P1-P4 .mind file is compiled
const NUM_TARGETS = 1

// scale factor so the runner track fits on a marker-sized area
const AR_SCALE = 0.08

// obstacle pool size per player
const OBSTACLES_PER_PLAYER = 20

interface ARGameRunnerProps {
  seed: number
  playerSlots: { targetIndex: number; detected: boolean }[]
  onPlayerDeath: (targetIndex: number, score: number) => void
  onScoreUpdate: (targetIndex: number, score: number) => void
}

export function ARGameRunner({
  seed,
  playerSlots: _playerSlots,
  onPlayerDeath,
  onScoreUpdate,
}: ARGameRunnerProps) {
  // _playerSlots reserved for future network-driven slot filtering
  void _playerSlots
  const { trigger } = useWebHaptics()
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)

  const onPlayerDeathRef = useRef(onPlayerDeath)
  const onScoreUpdateRef = useRef(onScoreUpdate)

  useEffect(() => {
    onPlayerDeathRef.current = onPlayerDeath
    onScoreUpdateRef.current = onScoreUpdate
  })

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let stopped = false

    const init = async () => {
      const mindarThree = new MindARThree({
        container,
        imageTargetSrc: TARGET_MIND_SRC,
        maxTrack: NUM_TARGETS,
      })

      const { renderer, scene, camera: arCamera } = mindarThree

      scene.add(new THREE.AmbientLight(0xffffff, 0.6))
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
      dirLight.position.set(0, 2, 1)
      scene.add(dirLight)

      // per-target game state
      const engines: (RunnerEngine | null)[] = []
      const ghostGroups: THREE.Group[] = []
      const obstaclePoolsPerTarget: THREE.Mesh[][] = []
      const obstacleMaterials: THREE.MeshStandardMaterial[] = []

      const boxGeometry = new THREE.BoxGeometry(1, 1, 1)

      for (let i = 0; i < NUM_TARGETS; i++) {
        const anchor = mindarThree.addAnchor(i)

        // scaled game container within the anchor
        const gameContainer = new THREE.Group()
        gameContainer.scale.setScalar(AR_SCALE)
        anchor.group.add(gameContainer)

        // ghost
        const ghostGroup = createGhostGroup(GHOST_COLORS[i % GHOST_COLORS.length], 0.6)
        gameContainer.add(ghostGroup)
        ghostGroups.push(ghostGroup)

        // obstacle pool
        const obstacleMat = new THREE.MeshStandardMaterial({ color: GHOST_COLORS[i] })
        obstacleMaterials.push(obstacleMat)
        const obstacles: THREE.Mesh[] = []
        for (let j = 0; j < OBSTACLES_PER_PLAYER; j++) {
          const mesh = new THREE.Mesh(boxGeometry, obstacleMat)
          mesh.visible = false
          gameContainer.add(mesh)
          obstacles.push(mesh)
        }
        obstaclePoolsPerTarget.push(obstacles)

        // ground plane per marker
        const groundGeo = new THREE.PlaneGeometry(6, 80)
        const groundMat = new THREE.MeshStandardMaterial({
          color: 0x1a1a1a,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.4,
        })
        const ground = new THREE.Mesh(groundGeo, groundMat)
        ground.rotation.x = -Math.PI / 2
        ground.position.z = -20
        gameContainer.add(ground)

        // engine — all share the same seed for identical obstacles
        const engine = new RunnerEngine({ seed })
        engines.push(engine)
      }

      if (stopped) return

      try {
        await mindarThree.start()
      } catch (err) {
        console.error("[ar-game] mindar failed to start:", err)
        return
      }

      if (stopped) {
        mindarThree.stop()
        return
      }

      // tap to jump — all local engines jump
      const handleTap = () => {
        let anyAlive = false
        for (const engine of engines) {
          if (engine?.alive) anyAlive = true
        }
        if (!anyAlive) return
        void trigger()
        for (const engine of engines) {
          engine?.jump()
        }
      }
      container.addEventListener("pointerdown", handleTap)

      let lastTime = performance.now()
      const deathHapticFired = new Set<number>()
      // throttle per-target score callbacks to ~10Hz to avoid 60Hz react re-renders
      const lastScoreReportMs: number[] = new Array(NUM_TARGETS).fill(0)
      const SCORE_REPORT_INTERVAL_MS = 100

      renderer.setAnimationLoop(() => {
        const now = performance.now()
        const dt = (now - lastTime) / 1000
        lastTime = now

        for (let i = 0; i < NUM_TARGETS; i++) {
          const engine = engines[i]
          if (!engine || !engine.alive) continue

          engine.update(dt)
          const state = engine.getState()

          // sync ghost y
          const ghost = ghostGroups[i]
          ghost.position.y = state.playerY

          // sync obstacles
          const pool = obstaclePoolsPerTarget[i]
          for (let j = 0; j < pool.length; j++) {
            const mesh = pool[j]
            const obs = state.obstacles[j]
            if (obs) {
              mesh.position.set(obs.x, obs.height / 2, obs.z)
              mesh.scale.set(obs.width, obs.height, obs.depth)
              mesh.visible = true
            } else {
              mesh.visible = false
            }
          }

          if (now - lastScoreReportMs[i] >= SCORE_REPORT_INTERVAL_MS) {
            lastScoreReportMs[i] = now
            onScoreUpdateRef.current(i, state.elapsed)
          }

          if (!state.alive) {
            if (!deathHapticFired.has(i)) {
              deathHapticFired.add(i)
              // "buzz" pattern from haptics.lochie.me — long sustained vibration on death
              void trigger([{ duration: 1000 }], { intensity: 1 })
            }
            onPlayerDeathRef.current(i, state.elapsed)
          }
        }

        renderer.render(scene, arCamera)
      })

      cleanupRef.current = () => {
        container.removeEventListener("pointerdown", handleTap)
        renderer.setAnimationLoop(null)
        mindarThree.stop()
        boxGeometry.dispose()
        for (const mat of obstacleMaterials) mat.dispose()
      }
    }

    init()

    return () => {
      stopped = true
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [seed, trigger])

  return <div ref={containerRef} className="ar-viewer" />
}

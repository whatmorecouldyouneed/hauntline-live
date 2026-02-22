/**
 * unified AR experience — lock-in-place for stability.
 * ghost + game content live in a frozenGroup in the scene (not on the anchor).
 * we copy the anchor pose on each update but keep last pose when lost.
 * MindAR's missTolerance delays the lost event; our freeze handles the rest.
 *
 * coordinate mapping:
 *   engine Y (jump) → marker Z (above card) via rotation.x = π/2
 */

import { useEffect, useRef, useCallback } from "react"
import * as THREE from "three"
import { MindARThree } from "mind-ar/dist/mindar-image-three.prod.js"
import { RunnerEngine } from "./engine/RunnerEngine"
import { loadCharacterModel, CHARACTER_MODELS, GHOST_COLORS } from "./meshes"
import type { MarkerState } from "./ARViewer"

const TARGET_MIND_SRC = "/markers/player-one.mind"
const NUM_TARGETS = 1
const OBSTACLES_PER_PLAYER = 20

// engine → AR scale (marker ≈ 1 unit wide)
const S = 0.5
// only render obstacles within this many AR units of the player
const MAX_VIS = 5.5

interface ARExperienceProps {
  phase: "scanning" | "lobby" | "countdown" | "playing" | "results"
  onMarkersUpdate?: (markers: MarkerState[]) => void
  seed: number
  onPlayerDeath: (targetIndex: number, score: number) => void
  onScoreUpdate: (targetIndex: number, score: number) => void
  playerSlots: { targetIndex: number; detected: boolean }[]
  recenterSignal?: number
}

export function ARExperience({
  phase,
  onMarkersUpdate,
  seed,
  onPlayerDeath,
  onScoreUpdate,
  playerSlots: _playerSlots,
  recenterSignal = 0,
}: ARExperienceProps) {
  void _playerSlots
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const phaseRef = useRef(phase)
  const seedRef = useRef(seed)
  const recenterRef = useRef(recenterSignal)
  const onPlayerDeathRef = useRef(onPlayerDeath)
  const onScoreUpdateRef = useRef(onScoreUpdate)
  phaseRef.current = phase
  seedRef.current = seed
  recenterRef.current = recenterSignal
  onPlayerDeathRef.current = onPlayerDeath
  onScoreUpdateRef.current = onScoreUpdate

  const markersRef = useRef<MarkerState[]>(
    Array.from({ length: NUM_TARGETS }, (_, i) => ({
      targetIndex: i,
      label: `P${i + 1}`,
      color: GHOST_COLORS[i % GHOST_COLORS.length],
      detected: false,
    }))
  )

  const updateMarker = useCallback(
    (index: number, detected: boolean) => {
      markersRef.current = markersRef.current.map((m, i) =>
        i === index ? { ...m, detected } : m
      )
      onMarkersUpdate?.([...markersRef.current])
    },
    [onMarkersUpdate]
  )

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let stopped = false
    const engines: RunnerEngine[] = []
    const ghostGroups: THREE.Group[] = []
    const frozenGroups: THREE.Group[] = []
    const obstaclePoolsPerTarget: THREE.Mesh[][] = []
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1)
    const obstacleMaterial = new THREE.MeshStandardMaterial({ color: 0x888888 })

    const init = async () => {
      const mindarThree = new MindARThree({
        container,
        imageTargetSrc: TARGET_MIND_SRC,
        maxTrack: NUM_TARGETS,
        uiLoading: "no",
        uiScanning: "no",
        uiError: "no",
        filterMinCF: 0.0001,
        filterBeta: 0.001,
        missTolerance: 60,
        warmupTolerance: 5,
      })

      const { renderer, scene, camera: arCamera } = mindarThree

      scene.add(new THREE.AmbientLight(0xffffff, 0.6))
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
      dirLight.position.set(0, 2, 1)
      scene.add(dirLight)

      // reusable vectors for lerping
      const _pos = new THREE.Vector3()
      const _quat = new THREE.Quaternion()
      const _scale = new THREE.Vector3()
      const _posB = new THREE.Vector3()
      const _quatB = new THREE.Quaternion()
      const _scaleB = new THREE.Vector3()
      const LERP_ALPHA = 0.08
      type ReadyPose = { pos: THREE.Vector3; quat: THREE.Quaternion; scale: THREE.Vector3 }
      let readyPoseRef: ReadyPose | null = null

      // P1=wisp+green, P2=spark+red, P3=classic+blue, P4=wraith+purple
      const characterTemplates = await Promise.all(
        Array.from({ length: NUM_TARGETS }, (_, i) =>
          loadCharacterModel(CHARACTER_MODELS[i], GHOST_COLORS[i])
        )
      )

      for (let i = 0; i < NUM_TARGETS; i++) {
        const anchor = mindarThree.addAnchor(i)

        // frozenGroup lives in the scene, not on the anchor
        const frozenGroup = new THREE.Group()
        frozenGroup.visible = false
        frozenGroup.matrixAutoUpdate = false
        scene.add(frozenGroup)
        frozenGroups.push(frozenGroup)

        // tilt so engine Y (jump) → marker Z (above card)
        const gameContainer = new THREE.Group()
        gameContainer.rotation.x = Math.PI / 2
        frozenGroup.add(gameContainer)

        const ghostGroup = characterTemplates[i].clone(true)
        gameContainer.add(ghostGroup)
        ghostGroups.push(ghostGroup)

        const obstacles: THREE.Mesh[] = []
        for (let j = 0; j < OBSTACLES_PER_PLAYER; j++) {
          const mesh = new THREE.Mesh(boxGeometry, obstacleMaterial)
          mesh.visible = false
          gameContainer.add(mesh)
          obstacles.push(mesh)
        }
        obstaclePoolsPerTarget.push(obstacles)

        // track strip (slot color: P1=green, P2=red, P3=blue, P4=purple)
        const trackGeo = new THREE.PlaneGeometry(0.15, MAX_VIS)
        const trackMat = new THREE.MeshBasicMaterial({
          color: GHOST_COLORS[i],
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
        })
        const track = new THREE.Mesh(trackGeo, trackMat)
        track.rotation.x = -Math.PI / 2
        track.position.z = -(MAX_VIS / 2)
        gameContainer.add(track)

        engines.push(new RunnerEngine({ seed: seedRef.current }))

        let poseInitialized = false
        let lastRecenter = recenterRef.current

        const lerpToAnchor = () => {
          // snap to marker on recenter; clear ready pose so we use new position as reference
          if (recenterRef.current !== lastRecenter) {
            lastRecenter = recenterRef.current
            poseInitialized = false
            readyPoseRef = null
          }
          anchor.group.matrix.decompose(_pos, _quat, _scale)
          const inGame = phaseRef.current === "countdown" || phaseRef.current === "playing"
          if (readyPoseRef && inGame) {
            // use ready pose as source of truth: 90% ready, 10% live tracking
            _posB.lerpVectors(readyPoseRef.pos, _pos, 0.1)
            _quatB.slerpQuaternions(readyPoseRef.quat, _quat, 0.1)
            _scaleB.lerpVectors(readyPoseRef.scale, _scale, 0.1)
          } else if (!poseInitialized) {
            _posB.copy(_pos)
            _quatB.copy(_quat)
            _scaleB.copy(_scale)
            poseInitialized = true
          } else {
            _posB.lerp(_pos, LERP_ALPHA)
            _quatB.slerp(_quat, LERP_ALPHA)
            _scaleB.lerp(_scale, LERP_ALPHA)
          }
          frozenGroup.matrix.compose(_posB, _quatB, _scaleB)
        }

        anchor.onTargetFound = () => {
          frozenGroup.visible = true
          poseInitialized = false
          lerpToAnchor()
          updateMarker(i, true)
        }
        anchor.onTargetUpdate = () => {
          lerpToAnchor()
        }
        anchor.onTargetLost = () => {
          updateMarker(i, false)
        }
      }

      if (stopped) return

      try {
        await mindarThree.start()
      } catch (err) {
        console.error("[ar] mindar failed to start:", err)
        return
      }

      if (stopped) {
        mindarThree.stop()
        return
      }

      const handleTap = () => {
        for (const engine of engines) engine.jump()
      }
      container.addEventListener("touchstart", handleTap, { passive: true })
      container.addEventListener("pointerdown", handleTap)

      let lastTime = performance.now()
      let wasPlaying = false
      let poseLocked = false
      const maxRenderZ = -MAX_VIS / S

      renderer.setAnimationLoop(() => {
        const now = performance.now()
        const dt = (now - lastTime) / 1000
        lastTime = now
        const currentPhase = phaseRef.current

        // capture ready pose when countdown starts — use as source of truth (keep tracking on)
        if (!poseLocked && (currentPhase === "countdown" || currentPhase === "playing")) {
          poseLocked = true
          const fg = frozenGroups[0]
          readyPoseRef = {
            pos: new THREE.Vector3(),
            quat: new THREE.Quaternion(),
            scale: new THREE.Vector3(),
          }
          fg.matrix.decompose(readyPoseRef.pos, readyPoseRef.quat, readyPoseRef.scale)
        }

        // hide all obstacles when not playing (no 3d artifacts after game)
        if (currentPhase !== "playing") {
          for (const pool of obstaclePoolsPerTarget) {
            for (const mesh of pool) mesh.visible = false
          }
        }

        if (currentPhase === "playing") {
          // reset engines on first frame of playing
          if (!wasPlaying) {
            for (const engine of engines) engine.reset(seedRef.current)
            wasPlaying = true
          }

          for (let i = 0; i < NUM_TARGETS; i++) {
            const engine = engines[i]
            if (!engine.alive) {
              // hide obstacles, keep ghost visible (dead state)
              for (const mesh of obstaclePoolsPerTarget[i]) mesh.visible = false
              continue
            }

            engine.update(dt)
            const state = engine.getState()

            ghostGroups[i].position.y = state.playerY * S

            const pool = obstaclePoolsPerTarget[i]
            for (let j = 0; j < pool.length; j++) {
              const mesh = pool[j]
              const obs = state.obstacles[j]
              if (obs && obs.z > maxRenderZ) {
                mesh.position.set(obs.x * S, (obs.height / 2) * S, obs.z * S)
                mesh.scale.set(obs.width * S, obs.height * S, obs.depth * S)
                mesh.visible = true
              } else {
                mesh.visible = false
              }
            }

            onScoreUpdateRef.current(i, state.elapsed)
            if (!state.alive) {
              onPlayerDeathRef.current(i, state.elapsed)
            }
          }
        } else {
          // idle: float ghost, obstacles already cleared above
          wasPlaying = false
          for (const group of ghostGroups) {
            const model = group.children[0]
            if (model) {
              model.position.y = 0.1 + Math.sin(Date.now() * 0.002) * 0.05
              model.rotation.y += 0.01
            }
          }
        }

        renderer.render(scene, arCamera)
      })

      cleanupRef.current = () => {
        container.removeEventListener("touchstart", handleTap)
        container.removeEventListener("pointerdown", handleTap)
        renderer.setAnimationLoop(null)
        mindarThree.stop()
        boxGeometry.dispose()
        obstacleMaterial.dispose()
      }
    }

    init()

    return () => {
      stopped = true
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [updateMarker])

  return (
    <div
      ref={containerRef}
      className="ar-viewer ar-viewer-touch-target"
      style={{ touchAction: "manipulation" }}
    />
  )
}

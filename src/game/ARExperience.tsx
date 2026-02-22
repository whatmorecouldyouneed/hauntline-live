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
import { clamp01, getIntroAnimState, jumpArc, INTRO_DURATION_MS } from "./introAnim"
import type { MarkerState } from "./ARViewer"

// ar spin axis chosen empirically — flip to 'z' if rotation looks wrong on device
const AR_SPIN_AXIS: "y" | "z" = "y"

// combined .mind with all 4 markers (P1=0, P2=1, P3=2, P4=3)
const TARGET_MIND_SRC = "/markers/targets.mind"
const NUM_TARGETS = 4
const OBSTACLES_PER_PLAYER = 20

// engine → AR scale (marker ≈ 1 unit wide)
const S = 0.5
// only render obstacles within this many AR units of the player
const MAX_VIS = 5.5

interface ARExperienceProps {
  phase: "scanning" | "lobby" | "introAnim" | "countdown" | "playing" | "results"
  introStartMs?: number | null
  onMarkersUpdate?: (markers: MarkerState[]) => void
  seed: number
  onPlayerDeath: (targetIndex: number, score: number) => void
  onScoreUpdate: (targetIndex: number, score: number) => void
  playerSlots: { targetIndex: number; detected: boolean }[]
  recenterSignal?: number
}

export function ARExperience({
  phase,
  introStartMs = null,
  onMarkersUpdate,
  seed,
  onPlayerDeath,
  onScoreUpdate,
  playerSlots,
  recenterSignal = 0,
}: ARExperienceProps) {
  const playerSlotsRef = useRef(playerSlots)
  playerSlotsRef.current = playerSlots
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const phaseRef = useRef(phase)
  const introStartMsRef = useRef<number | null>(introStartMs)
  const seedRef = useRef(seed)
  const recenterRef = useRef(recenterSignal)
  phaseRef.current = phase
  introStartMsRef.current = introStartMs
  const onPlayerDeathRef = useRef(onPlayerDeath)
  const onScoreUpdateRef = useRef(onScoreUpdate)
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
    const obstacleMaterials: THREE.MeshStandardMaterial[] = []
    const boxGeometry = new THREE.BoxGeometry(1, 1, 1)

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

        // track tube (slot color: P1=green, P2=red, P3=blue, P4=purple)
        const trackPath = new THREE.LineCurve3(
          new THREE.Vector3(0, 0, -MAX_VIS / 2),
          new THREE.Vector3(0, 0, MAX_VIS / 2)
        )
        const trackGeo = new THREE.TubeGeometry(trackPath, 8, 0.0375, 12, false)
        const trackMat = new THREE.MeshBasicMaterial({
          color: GHOST_COLORS[i],
          transparent: true,
          opacity: 0.8,
          side: THREE.DoubleSide,
        })
        const track = new THREE.Mesh(trackGeo, trackMat)
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
          frozenGroup.visible = false
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
        if (phaseRef.current !== "playing") return
        const slots = playerSlotsRef.current
        const isSinglePlayer = slots.length === 1
        if (isSinglePlayer && slots[0]) {
          engines[slots[0].targetIndex]?.jump()
        } else {
          for (const engine of engines) engine.jump()
        }
      }
      container.addEventListener("touchstart", handleTap, { passive: true })
      container.addEventListener("pointerdown", handleTap)

      let lastTime = performance.now()
      let wasPlaying = false
      let poseLocked = false
      let readyRotationRef: number | null = null
      const maxRenderZ = -MAX_VIS / S

      renderer.setAnimationLoop(() => {
        const now = performance.now()
        const dt = (now - lastTime) / 1000
        lastTime = now
        const currentPhase = phaseRef.current

        // single player: only show the active marker's ghost (hide others even if in view)
        const slots = playerSlotsRef.current
        if (slots.length === 1 && slots[0]) {
          const activeIdx = slots[0].targetIndex
          for (let i = 0; i < frozenGroups.length; i++) {
            const m = markersRef.current[i]
            const detected = m?.detected ?? false
            frozenGroups[i].visible = detected && i === activeIdx
          }
        }

        // capture ready pose when countdown starts — use as source of truth (keep tracking on)
        if (!poseLocked && (currentPhase === "countdown" || currentPhase === "playing")) {
          poseLocked = true
          const slots = playerSlotsRef.current
          const activeIdx = slots.length === 1 && slots[0] ? slots[0].targetIndex : 0
          const fg = frozenGroups[activeIdx]
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

        if (currentPhase === "introAnim" && introStartMsRef.current != null) {
          // capture ghost rotation on first intro frame (from lobby spin)
          if (readyRotationRef === null) {
            const slots = playerSlotsRef.current
            const activeIdx = slots.length === 1 && slots[0] ? slots[0].targetIndex : 0
            const model = ghostGroups[activeIdx].children[0]
            readyRotationRef = model?.rotation?.y ?? 0
          }

          const t = clamp01((now - introStartMsRef.current) / INTRO_DURATION_MS)
          const { jumpP, slideP } = getIntroAnimState(t)
          const startZ = -0.5
          const endZ = 0
          const jumpHeight = 0.15
          const capturedRot = readyRotationRef ?? 0

          for (let i = 0; i < ghostGroups.length; i++) {
            const g = ghostGroups[i]
            const model = g.children[0]
            if (t >= 1) {
              g.position.set(0, 0, endZ)
              if (model) {
                if (AR_SPIN_AXIS === "y") model.rotation.y = capturedRot
                else model.rotation.z = capturedRot
              }
              g.rotation.y = 0
              g.rotation.z = 0
            } else {
              g.position.x = 0
              g.position.y = jumpHeight * jumpArc(jumpP)
              g.position.z = startZ + (endZ - startZ) * slideP
              if (model) {
                if (AR_SPIN_AXIS === "y") model.rotation.y = capturedRot
                else model.rotation.z = capturedRot
              }
              g.rotation.y = 0
              g.rotation.z = 0
            }
          }
        } else if (currentPhase === "playing") {
          // reset engines on first frame of playing
          if (!wasPlaying) {
            for (const engine of engines) engine.reset(seedRef.current)
            wasPlaying = true
          }

          const slots = playerSlotsRef.current
          const isSinglePlayer = slots.length === 1
          const activeIndices = isSinglePlayer && slots[0]
            ? [slots[0].targetIndex]
            : Array.from({ length: NUM_TARGETS }, (_, i) => i)

          for (const i of activeIndices) {
            const engine = engines[i]
            if (!engine?.alive) {
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
        } else if (currentPhase === "lobby") {
          readyRotationRef = null
        }

        if (currentPhase !== "introAnim" && currentPhase !== "playing") {
          // idle: float ghost (lobby), obstacles already cleared above
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
        for (const mat of obstacleMaterials) mat.dispose()
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

import { useEffect, useRef, useState, useCallback } from "react"
import * as THREE from "three"
import { MindARThree } from "mind-ar/dist/mindar-image-three.prod.js"
import { createGhostGroup, GHOST_COLORS } from "./meshes"

// TODO: replace with P1-P4 compiled .mind file (skipped tonight, do tomorrow)
const TARGET_MIND_SRC = "/markers/targets.mind"

// TODO: bump to 4 when P1-P4 .mind file is compiled
const NUM_TARGETS = 1

const PLAYER_LABELS = ["P1", "P2", "P3", "P4"]

export interface MarkerState {
  targetIndex: number
  label: string
  color: number
  detected: boolean
}

interface ARViewerProps {
  onMarkersUpdate?: (markers: MarkerState[]) => void
  onTargetFound?: (targetIndex: number) => void
  onTargetLost?: (targetIndex: number) => void
}

export function ARViewer({ onMarkersUpdate, onTargetFound, onTargetLost }: ARViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const cleanupRef = useRef<(() => void) | null>(null)
  const markersRef = useRef<MarkerState[]>(
    Array.from({ length: NUM_TARGETS }, (_, i) => ({
      targetIndex: i,
      label: PLAYER_LABELS[i],
      color: GHOST_COLORS[i],
      detected: false,
    }))
  )
  const [tracking, setTracking] = useState<boolean[]>(
    Array(NUM_TARGETS).fill(false)
  )

  const updateMarker = useCallback((index: number, detected: boolean) => {
    markersRef.current = markersRef.current.map((m, i) =>
      i === index ? { ...m, detected } : m
    )
    setTracking((prev) => {
      const next = [...prev]
      next[index] = detected
      return next
    })
    onMarkersUpdate?.([...markersRef.current])
  }, [onMarkersUpdate])

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

      const ghostGroups: THREE.Group[] = []

      for (let i = 0; i < NUM_TARGETS; i++) {
        const anchor = mindarThree.addAnchor(i)
        const ghostGroup = createGhostGroup(GHOST_COLORS[i % GHOST_COLORS.length])
        anchor.group.add(ghostGroup)
        ghostGroups.push(ghostGroup)

        anchor.onTargetFound = () => {
          updateMarker(i, true)
          onTargetFound?.(i)
        }

        anchor.onTargetLost = () => {
          updateMarker(i, false)
          onTargetLost?.(i)
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

      renderer.setAnimationLoop(() => {
        for (const group of ghostGroups) {
          const sphere = group.children[0]
          if (sphere) {
            sphere.position.y = 0.4 + Math.sin(Date.now() * 0.002) * 0.05
            sphere.rotation.y += 0.01
          }
        }
        renderer.render(scene, arCamera)
      })

      cleanupRef.current = () => {
        renderer.setAnimationLoop(null)
        mindarThree.stop()
      }
    }

    init()

    return () => {
      stopped = true
      cleanupRef.current?.()
      cleanupRef.current = null
    }
  }, [onTargetFound, onTargetLost, updateMarker])

  const anyTracking = tracking.some(Boolean)

  return (
    <div ref={containerRef} className="ar-viewer">
      {!anyTracking && (
        <div className="ar-scanning-overlay">
          <p>scanning for markers...</p>
        </div>
      )}
    </div>
  )
}

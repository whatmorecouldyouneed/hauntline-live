import { useEffect, useRef } from "react"
import * as THREE from "three"
import { loadCharacterModel, CHARACTER_MODELS, GHOST_COLORS } from "./meshes"
import type { CharacterIndex } from "./meshes"

interface CharacterViewer3DProps {
  characterIndex: CharacterIndex
}

export function CharacterViewer3D({ characterIndex }: CharacterViewer3DProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    let cancelled = false
    let frameId: number | undefined
    let renderer: THREE.WebGLRenderer | undefined
    let camera: THREE.PerspectiveCamera | undefined
    let scene: THREE.Scene | undefined
    let ghostGroup: THREE.Group | undefined
    let handleResize: (() => void) | undefined

    const init = async () => {
      ghostGroup = await loadCharacterModel(
        CHARACTER_MODELS[characterIndex],
        GHOST_COLORS[characterIndex],
        { targetSize: 1.2, rotateY: 0 }
      )
      if (cancelled) return

      scene = new THREE.Scene()
      scene.background = new THREE.Color(0x0a0a0a)

      camera = new THREE.PerspectiveCamera(
        60,
        container.clientWidth / container.clientHeight,
        0.1,
        100
      )
      ghostGroup.position.set(0, 0.5, 0)
      scene.add(ghostGroup)

      const box = new THREE.Box3().setFromObject(ghostGroup)
      const center = new THREE.Vector3()
      box.getCenter(center)

      camera.position.set(0, center.y, 3)
      camera.lookAt(center)

      renderer = new THREE.WebGLRenderer({ antialias: true })
      renderer.setSize(container.clientWidth, container.clientHeight)
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
      container.appendChild(renderer.domElement)

      scene.add(new THREE.AmbientLight(0xffffff, 0.6))
      const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
      dirLight.position.set(2, 10, 5)
      scene.add(dirLight)

      const animate = () => {
        frameId = requestAnimationFrame(animate)
        if (ghostGroup && !cancelled) {
          ghostGroup.rotation.y += 0.005
        }
        if (renderer && scene && camera) renderer.render(scene, camera)
      }

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
      if (ghostGroup && scene) {
        ghostGroup.traverse((obj) => {
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
      if (renderer) {
        renderer.domElement.remove()
        renderer.dispose()
      }
    }
  }, [characterIndex])

  return <div ref={containerRef} className="character-viewer-3d" />
}

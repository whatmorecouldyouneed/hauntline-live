import { useEffect, useRef } from "react"
import * as THREE from "three"
import { RunnerEngine } from "./engine/RunnerEngine"
import { createGhostGroup, createObstaclePool } from "./meshes"

interface GameCanvasProps {
  onDeath: (elapsed: number) => void
  onElapsed?: (elapsed: number) => void
}

export function GameCanvas({ onDeath, onElapsed }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const engine = new RunnerEngine()

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0x0a0a0a)
    scene.fog = new THREE.Fog(0x0a0a0a, 5, 60)

    const camera = new THREE.PerspectiveCamera(
      60,
      container.clientWidth / container.clientHeight,
      0.1,
      100
    )
    camera.position.set(0, 2, 8)
    camera.lookAt(0, 0, -20)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setSize(container.clientWidth, container.clientHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const ghostGroup = createGhostGroup(0x00ff88, 0.6)
    scene.add(ghostGroup)

    // ground plane
    const groundGeometry = new THREE.PlaneGeometry(20, 200, 1, 1)
    const groundMaterial = new THREE.MeshStandardMaterial({
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
    let frameId: number

    const animate = () => {
      frameId = requestAnimationFrame(animate)
      const now = performance.now()
      const dt = (now - lastTime) / 1000
      lastTime = now

      engine.update(dt)
      const state = engine.getState()

      // sync ghost position
      ghostGroup.position.y = state.playerY

      // sync obstacle meshes
      for (let i = 0; i < obstacleMeshes.length; i++) {
        const mesh = obstacleMeshes[i]
        const obs = state.obstacles[i]
        if (obs) {
          mesh.position.set(obs.x, obs.height / 2, obs.z)
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

      renderer.render(scene, camera)
    }

    const handleTap = () => engine.jump()
    container.addEventListener("touchstart", handleTap, { passive: true })
    container.addEventListener("pointerdown", handleTap)

    const handleResize = () => {
      if (!container) return
      camera.aspect = container.clientWidth / container.clientHeight
      camera.updateProjectionMatrix()
      renderer.setSize(container.clientWidth, container.clientHeight)
    }
    window.addEventListener("resize", handleResize)

    animate()

    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener("resize", handleResize)
      container.removeEventListener("touchstart", handleTap)
      container.removeEventListener("pointerdown", handleTap)
      renderer.domElement.remove()
      renderer.dispose()
      groundGeometry.dispose()
      groundMaterial.dispose()
    }
  }, [onDeath, onElapsed])

  return <div ref={containerRef} className="game-canvas" />
}

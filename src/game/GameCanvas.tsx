import { useEffect, useRef } from "react"
import * as THREE from "three"
import { RunnerEngine } from "./engine/RunnerEngine"

// TODO: replace sphere/box with GLB assets via Meshy

const PLAYER_X = 0

interface GameCanvasProps {
  onDeath: (elapsed: number) => void
  onElapsed?: (elapsed: number) => void
}

export function GameCanvas({ onDeath, onElapsed }: GameCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<RunnerEngine | null>(null)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const engine = new RunnerEngine()
    engineRef.current = engine

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

    // ghost (glowing sphere)
    const ghostGeometry = new THREE.SphereGeometry(0.6, 16, 16)
    const ghostMaterial = new THREE.MeshStandardMaterial({
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 0.8,
    })
    const ghost = new THREE.Mesh(ghostGeometry, ghostMaterial)
    ghost.position.x = PLAYER_X
    ghost.position.y = 0
    ghost.position.z = 0
    scene.add(ghost)

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

    // ambient light — bright for dev visibility
    scene.add(new THREE.AmbientLight(0xffffff, 0.6))

    // directional light (from above-front)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(2, 10, 5)
    scene.add(dirLight)

    // obstacle pool: reuse box geometries
    const boxGeometry = new THREE.BoxGeometry(2, 2, 2)
    const obstacleMaterial = new THREE.MeshStandardMaterial({
      color: 0x888888,
    })
    const obstacleMeshes: THREE.Mesh[] = []
    const maxObstacles = 30
    for (let i = 0; i < maxObstacles; i++) {
      const mesh = new THREE.Mesh(boxGeometry, obstacleMaterial)
      mesh.visible = false
      scene.add(mesh)
      obstacleMeshes.push(mesh)
    }

    let lastTime = performance.now()
    let frameId: number

    const animate = () => {
      frameId = requestAnimationFrame(animate)
      const now = performance.now()
      const dt = Math.min((now - lastTime) / 1000, 0.1)
      lastTime = now

      engine.update(dt)
      const state = engine.getState()

      // sync ghost y (offset by radius so it sits on the ground)
      ghost.position.y = state.playerY + 0.6

      // sync obstacle meshes
      for (let i = 0; i < obstacleMeshes.length; i++) {
        const mesh = obstacleMeshes[i]
        const obs = state.obstacles[i]
        if (obs) {
          mesh.position.set(obs.x, obs.height / 2, obs.z)
          mesh.scale.set(
            obs.width / 2,
            obs.height / 2,
            obs.depth / 2
          )
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
      ghostGeometry.dispose()
      ghostMaterial.dispose()
      groundGeometry.dispose()
      groundMaterial.dispose()
      boxGeometry.dispose()
      obstacleMaterial.dispose()
      engineRef.current = null
    }
  }, [onDeath, onElapsed])

  return <div ref={containerRef} className="game-canvas" />
}

/**
 * pure simulation engine for the endless runner.
 * no three.js dependency — testable in isolation.
 *
 * TODO: MindAR marker scan-to-spawn (P1–P4 unique printed markers)
 * TODO: deterministic seed + startTime for online rooms
 */

export interface Obstacle {
  id: number
  x: number
  z: number
  width: number
  height: number
  depth: number
}

export interface RunnerState {
  playerY: number
  obstacles: Obstacle[]
  speed: number
  elapsed: number
  alive: boolean
}

// physics constants
const GRAVITY = -18
const JUMP_VELOCITY = 8
const GROUND_Y = 0
const PLAYER_X = 0

// obstacle movement
const BASE_SPEED = 12
const MAX_SPEED = 28
const SPAWN_INTERVAL_START = 1.2
const SPAWN_INTERVAL_MIN = 0.5
const RAMP_DURATION = 45

// collision
const DANGER_Z_MIN = -1.5
const DANGER_Z_MAX = 1.5
const JUMP_THRESHOLD = 1.2
const PLAYER_HALF_WIDTH = 0.8

// spawning
const SPAWN_Z = -55
const OBSTACLE_WIDTH = 1.5
const OBSTACLE_HEIGHT_MIN = 0.6
const OBSTACLE_HEIGHT_MAX = 1.4
const OBSTACLE_DEPTH = 1.5

let nextObstacleId = 0

export class RunnerEngine {
  private playerY = GROUND_Y
  private velocityY = 0
  private obstacles: Obstacle[] = []
  private speed = BASE_SPEED
  private spawnTimer = 0
  private elapsed = 0
  alive = true

  jump(): void {
    if (!this.alive) return
    // can only jump when near ground
    if (this.playerY <= GROUND_Y + 0.01) {
      this.velocityY = JUMP_VELOCITY
    }
  }

  update(dt: number): void {
    if (!this.alive) return

    this.elapsed += dt

    // difficulty ramp: speed increases, spawn interval decreases
    const ramp = Math.min(1, this.elapsed / RAMP_DURATION)
    this.speed = BASE_SPEED + (MAX_SPEED - BASE_SPEED) * ramp
    const spawnInterval =
      SPAWN_INTERVAL_START -
      (SPAWN_INTERVAL_START - SPAWN_INTERVAL_MIN) * ramp

    // gravity
    this.velocityY += GRAVITY * dt
    this.playerY += this.velocityY * dt
    if (this.playerY < GROUND_Y) {
      this.playerY = GROUND_Y
      this.velocityY = 0
    }

    // move obstacles toward camera (positive z toward player)
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i]
      o.z += this.speed * dt
      if (o.z > 10) {
        this.obstacles.splice(i, 1)
      }
    }

    // spawn new obstacles
    this.spawnTimer += dt
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer -= spawnInterval
      this.obstacles.push(this.createObstacle())
    }

    // collision: obstacle in danger zone, same lane (x overlap), player below jump threshold
    for (const o of this.obstacles) {
      if (o.z < DANGER_Z_MIN || o.z > DANGER_Z_MAX) continue
      const oxMin = o.x - o.width / 2
      const oxMax = o.x + o.width / 2
      const pxMin = PLAYER_X - PLAYER_HALF_WIDTH
      const pxMax = PLAYER_X + PLAYER_HALF_WIDTH
      if (oxMax < pxMin || oxMin > pxMax) continue
      if (this.playerY < JUMP_THRESHOLD) {
        this.alive = false
        return
      }
    }
  }

  private createObstacle(): Obstacle {
    const height = OBSTACLE_HEIGHT_MIN +
      Math.random() * (OBSTACLE_HEIGHT_MAX - OBSTACLE_HEIGHT_MIN)
    return {
      id: nextObstacleId++,
      x: PLAYER_X,
      z: SPAWN_Z,
      width: OBSTACLE_WIDTH,
      height,
      depth: OBSTACLE_DEPTH,
    }
  }

  getState(): RunnerState {
    return {
      playerY: this.playerY,
      obstacles: [...this.obstacles],
      speed: this.speed,
      elapsed: this.elapsed,
      alive: this.alive,
    }
  }

  getElapsed(): number {
    return this.elapsed
  }

  reset(): void {
    this.playerY = GROUND_Y
    this.velocityY = 0
    this.obstacles = []
    this.speed = BASE_SPEED
    this.spawnTimer = 0
    this.elapsed = 0
    this.alive = true
  }
}

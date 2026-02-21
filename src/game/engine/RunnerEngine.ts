/**
 * pure simulation engine for the endless runner.
 * no three.js dependency — testable in isolation.
 * deterministic when given a seed (uses Mulberry32 PRNG).
 *
 * TODO: MindAR marker scan-to-spawn (P1–P4 unique printed markers)
 * TODO: online rooms — pass shared seed + startTime from server
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

export interface RunnerEngineOptions {
  seed?: number
  tickRate?: number
}

// mulberry32 PRNG: deterministic, same seed = same sequence on every device
class Mulberry32 {
  private state: number
  constructor(seed: number) {
    this.state = seed >>> 0
  }
  next(): number {
    let t = (this.state += 0x6d2b79f5)
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// physics
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

// default fixed timestep: 60Hz
const DEFAULT_TICK_RATE = 60

export class RunnerEngine {
  private playerY = GROUND_Y
  private velocityY = 0
  private obstacles: Obstacle[] = []
  private speed = BASE_SPEED
  private spawnTimer = 0
  private elapsed = 0
  private nextObstacleId = 0
  private rng: Mulberry32
  private tickDt: number
  private accumulator = 0
  alive = true

  constructor(options?: RunnerEngineOptions) {
    const seed = options?.seed ?? Date.now()
    const tickRate = options?.tickRate ?? DEFAULT_TICK_RATE
    this.rng = new Mulberry32(seed)
    this.tickDt = 1 / tickRate
  }

  jump(): void {
    if (!this.alive) return
    if (this.playerY <= GROUND_Y + 0.01) {
      this.velocityY = JUMP_VELOCITY
    }
  }

  /**
   * advances simulation by realDt seconds using fixed-timestep stepping.
   * ensures deterministic results regardless of frame rate.
   */
  update(realDt: number): void {
    if (!this.alive) return

    this.accumulator += Math.min(realDt, 0.1)

    while (this.accumulator >= this.tickDt) {
      this.tick(this.tickDt)
      this.accumulator -= this.tickDt
      if (!this.alive) return
    }
  }

  private tick(dt: number): void {
    this.elapsed += dt

    // difficulty ramp
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

    // move obstacles toward camera
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const o = this.obstacles[i]
      o.z += this.speed * dt
      if (o.z > 10) {
        this.obstacles.splice(i, 1)
      }
    }

    // spawn
    this.spawnTimer += dt
    if (this.spawnTimer >= spawnInterval) {
      this.spawnTimer -= spawnInterval
      this.obstacles.push(this.createObstacle())
    }

    // collision
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
    const height =
      OBSTACLE_HEIGHT_MIN +
      this.rng.next() * (OBSTACLE_HEIGHT_MAX - OBSTACLE_HEIGHT_MIN)
    return {
      id: this.nextObstacleId++,
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

  reset(seed?: number): void {
    this.playerY = GROUND_Y
    this.velocityY = 0
    this.obstacles = []
    this.speed = BASE_SPEED
    this.spawnTimer = 0
    this.elapsed = 0
    this.accumulator = 0
    this.nextObstacleId = 0
    this.alive = true
    if (seed !== undefined) {
      this.rng = new Mulberry32(seed)
    }
  }
}

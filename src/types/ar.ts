/** per-player slot in AR multiplayer */
export interface ARPlayerSlot {
  targetIndex: number
  label: string
  color: number
  detected: boolean
  ready: boolean
  alive: boolean
  score: number
  name: string
}

export type ARPhase = "scanning" | "lobby" | "introAnim" | "countdown" | "playing" | "results"

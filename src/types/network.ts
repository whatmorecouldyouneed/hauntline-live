/** messages sent from client to server */
export type ClientMsg =
  | { type: "join"; name: string; targetIndex: number }
  | { type: "ready" }
  | { type: "jump" }
  | { type: "death"; score: number }
  | { type: "rematch" }

/** messages sent from server to clients */
export type ServerMsg =
  | { type: "state"; state: RoomState }
  | { type: "start"; seed: number; startTime: number }
  | { type: "playerJump"; playerId: string }
  | { type: "playerDeath"; playerId: string; score: number }

export interface RoomPlayer {
  name: string
  targetIndex: number
  ready: boolean
  alive: boolean
  score: number
}

export interface RoomState {
  seed: number
  players: Record<string, RoomPlayer>
  phase: "lobby" | "countdown" | "playing" | "results"
  startTime?: number
}

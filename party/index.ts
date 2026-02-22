import type * as Party from "partykit/server"

interface RoomPlayer {
  name: string
  targetIndex: number
  ready: boolean
  alive: boolean
  score: number
}

interface RoomState {
  seed: number
  players: Record<string, RoomPlayer>
  phase: "lobby" | "countdown" | "playing" | "results"
  startTime?: number
}

function createInitialState(): RoomState {
  return {
    seed: Math.floor(Math.random() * 2147483647),
    players: {},
    phase: "lobby",
  }
}

export default class HauntlineServer implements Party.Server {
  state: RoomState

  constructor(readonly room: Party.Room) {
    this.state = createInitialState()
  }

  onConnect(connection: Party.Connection) {
    connection.send(JSON.stringify({ type: "state", state: this.state }))
  }

  onMessage(message: string, sender: Party.Connection) {
    const msg = JSON.parse(message)

    switch (msg.type) {
      case "join":
        this.state.players[sender.id] = {
          name: msg.name,
          targetIndex: msg.targetIndex,
          ready: false,
          alive: true,
          score: 0,
        }
        this.broadcast({ type: "state", state: this.state })
        break

      case "ready": {
        if (this.state.players[sender.id]) {
          this.state.players[sender.id].ready = true
        }
        const players = Object.values(this.state.players)
        if (players.length > 0 && players.every((p) => p.ready)) {
          this.state.phase = "playing"
          this.state.startTime = Date.now()
          this.broadcast({
            type: "start",
            seed: this.state.seed,
            startTime: this.state.startTime,
          })
        } else {
          this.broadcast({ type: "state", state: this.state })
        }
        break
      }

      case "jump":
        this.broadcast(
          { type: "playerJump", playerId: sender.id },
          [sender.id]
        )
        break

      case "death": {
        if (this.state.players[sender.id]) {
          this.state.players[sender.id].alive = false
          this.state.players[sender.id].score = msg.score
        }
        this.broadcast({
          type: "playerDeath",
          playerId: sender.id,
          score: msg.score,
        })
        const allDead = Object.values(this.state.players).every(
          (p) => !p.alive
        )
        if (allDead) {
          this.state.phase = "results"
          this.broadcast({ type: "state", state: this.state })
        }
        break
      }
    }
  }

  onClose(connection: Party.Connection) {
    delete this.state.players[connection.id]
    this.broadcast({ type: "state", state: this.state })
  }

  private broadcast(msg: unknown, exclude?: string[]) {
    const data = JSON.stringify(msg)
    for (const conn of this.room.getConnections()) {
      if (exclude && exclude.includes(conn.id)) continue
      conn.send(data)
    }
  }
}

HauntlineServer satisfies Party.Worker

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
      case "join": {
        this.state.players[sender.id] = {
          name: msg.name,
          targetIndex: msg.targetIndex,
          ready: false,
          alive: true,
          score: 0,
        }
        // #region agent log
        const joinPlayers = Object.values(this.state.players)
        fetch("http://127.0.0.1:7927/ingest/8f1c4d81-ffd0-4929-98ed-0d2bd56ad55d", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "12be76" },
          body: JSON.stringify({
            sessionId: "12be76",
            location: "party/index.ts:join",
            message: "join received",
            data: {
              senderId: sender.id,
              name: msg.name,
              targetIndex: msg.targetIndex,
              playerCount: joinPlayers.length,
              players: joinPlayers.map((p) => ({ name: p.name, targetIndex: p.targetIndex })),
            },
            timestamp: Date.now(),
            hypothesisId: "H1_H2",
          }),
        }).catch(() => {})
        // #endregion
        this.broadcast({ type: "state", state: this.state })
        break
      }

      case "ready": {
        if (this.state.players[sender.id]) {
          this.state.players[sender.id].ready = true
        }
        const players = Object.values(this.state.players)
        const allReady = players.every((p) => p.ready)
        const readyCount = players.filter((p) => p.ready).length
        // #region agent log
        fetch("http://127.0.0.1:7927/ingest/8f1c4d81-ffd0-4929-98ed-0d2bd56ad55d", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "12be76" },
          body: JSON.stringify({
            sessionId: "12be76",
            location: "party/index.ts:ready",
            message: "ready received",
            data: {
              senderId: sender.id,
              playerCount: players.length,
              readyCount,
              allReady,
              willStart: players.length >= 2 && allReady,
              players: players.map((p) => ({
                name: p.name,
                targetIndex: p.targetIndex,
                ready: p.ready,
              })),
            },
            timestamp: Date.now(),
            hypothesisId: "H1_H5",
          }),
        }).catch(() => {})
        // #endregion
        // require at least 2 players and all ready before starting
        if (players.length >= 2 && allReady) {
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

      case "rematch": {
        for (const p of Object.values(this.state.players)) {
          p.ready = false
          p.alive = true
          p.score = 0
        }
        this.state.phase = "lobby"
        this.broadcast({ type: "state", state: this.state })
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

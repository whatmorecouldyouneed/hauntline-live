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
        this.broadcastState()
        break

      case "ready": {
        if (this.state.players[sender.id]) {
          this.state.players[sender.id].ready = true
        }
        const players = Object.values(this.state.players)
        // require at least 2 players and all ready before starting
        if (players.length >= 2 && players.every((p) => p.ready)) {
          this.state.phase = "playing"
          this.state.startTime = Date.now()
          this.room.broadcast(
            JSON.stringify({
              type: "start",
              seed: this.state.seed,
              startTime: this.state.startTime,
            })
          )
        } else {
          this.broadcastState()
        }
        break
      }

      case "jump":
        this.room.broadcast(
          JSON.stringify({ type: "playerJump", playerId: sender.id }),
          [sender.id]
        )
        break

      case "death": {
        if (this.state.players[sender.id]) {
          this.state.players[sender.id].alive = false
          this.state.players[sender.id].score = msg.score
        }
        this.room.broadcast(
          JSON.stringify({
            type: "playerDeath",
            playerId: sender.id,
            score: msg.score,
          })
        )
        // only go to results when everyone is dead (game continues for survivors)
        const players = Object.values(this.state.players)
        const anyAlive = players.some((p) => p.alive)
        // #region agent log
        fetch('http://127.0.0.1:7927/ingest/8f1c4d81-ffd0-4929-98ed-0d2bd56ad55d',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'12be76'},body:JSON.stringify({sessionId:'12be76',location:'party/index.ts:death',message:'server death handler',data:{senderId:sender.id,playerCount:players.length,anyAlive,transitionToResults:players.length>0&&!anyAlive,scores:players.map(p=>({name:p.name,alive:p.alive,score:p.score}))},hypothesisId:'A',timestamp:Date.now()})}).catch(()=>{});
        // #endregion
        if (players.length > 0 && !anyAlive) {
          this.state.phase = "results"
          this.broadcastState()
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
        this.broadcastState()
        break
      }
    }
  }

  onClose(connection: Party.Connection) {
    delete this.state.players[connection.id]
    this.broadcastState()
  }

  private broadcastState() {
    this.room.broadcast(
      JSON.stringify({ type: "state", state: this.state })
    )
  }
}

HauntlineServer satisfies Party.Worker

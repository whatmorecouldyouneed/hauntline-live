import type * as Party from "partykit/server"
import { Filter } from "bad-words"

const MAX_ENTRIES = 100
const MAX_NAME_LENGTH = 20

interface LeaderboardEntry {
  name: string
  score: number
}

const profanityFilter = new Filter()

export default class LeaderboardServer implements Party.Server {
  leaderboard: LeaderboardEntry[] = []

  constructor(readonly room: Party.Room) {}

  async onStart() {
    this.leaderboard =
      (await this.room.storage.get<LeaderboardEntry[]>("leaderboard")) ?? []
  }

  async onRequest(request: Party.Request): Promise<Response> {
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    }

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    if (request.method === "GET") {
      return new Response(JSON.stringify(this.leaderboard), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    if (request.method === "POST") {
      let body: { name?: string; score?: number }
      try {
        body = (await request.json()) as { name?: string; score?: number }
      } catch {
        return new Response(
          JSON.stringify({ error: "Invalid JSON body" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        )
      }

      const rawName = typeof body.name === "string" ? body.name.trim() : ""
      const name = rawName.slice(0, MAX_NAME_LENGTH)
      const score =
        typeof body.score === "number" && body.score >= 0
          ? Math.floor(body.score)
          : -1

      if (!name) {
        return new Response(
          JSON.stringify({ error: "Name is required" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        )
      }

      if (score < 0) {
        return new Response(
          JSON.stringify({ error: "Score must be a non-negative number" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        )
      }

      if (profanityFilter.isProfane(name)) {
        return new Response(
          JSON.stringify({
            error: "Please choose a different name",
          }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        )
      }

      const existingIndex = this.leaderboard.findIndex(
        (e) => e.name.toLowerCase() === name.toLowerCase()
      )
      if (existingIndex >= 0) {
        if (score > this.leaderboard[existingIndex].score) {
          this.leaderboard[existingIndex] = { name, score }
        }
      } else {
        this.leaderboard.push({ name, score })
      }

      this.leaderboard.sort((a, b) => b.score - a.score)
      this.leaderboard = this.leaderboard.slice(0, MAX_ENTRIES)
      await this.room.storage.put("leaderboard", this.leaderboard)

      return new Response(JSON.stringify({ ok: true }), {
        headers: { "Content-Type": "application/json", ...corsHeaders },
      })
    }

    return new Response("Method not allowed", {
      status: 405,
      headers: corsHeaders,
    })
  }
}

LeaderboardServer satisfies Party.Worker

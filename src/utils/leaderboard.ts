const PARTYKIT_HOST =
  import.meta.env.VITE_PARTYKIT_HOST ?? "localhost:1999"
const LEADERBOARD_ROOM = "global"
const PROTOCOL = PARTYKIT_HOST.startsWith("localhost") ? "http" : "https"

export interface LeaderboardEntry {
  name: string
  score: number
}

const leaderboardUrl = `${PROTOCOL}://${PARTYKIT_HOST}/parties/leaderboard/${LEADERBOARD_ROOM}`

export async function fetchLeaderboard(): Promise<LeaderboardEntry[]> {
  const res = await fetch(leaderboardUrl)
  if (!res.ok) throw new Error("Failed to fetch leaderboard")
  return res.json()
}

export async function submitScore(
  name: string,
  score: number
): Promise<{ ok: boolean } | { error: string }> {
  const res = await fetch(leaderboardUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: name.trim(), score }),
  })
  const data = (await res.json()) as { ok?: boolean; error?: string }
  if (!res.ok) return { error: data.error ?? "Failed to submit score" }
  return { ok: true }
}

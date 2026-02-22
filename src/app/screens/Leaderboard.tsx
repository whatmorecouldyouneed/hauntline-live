import { useState, useEffect } from "react"
import {
  fetchLeaderboard,
  type LeaderboardEntry,
} from "../../utils/leaderboard"

interface LeaderboardProps {
  onBack: () => void
}

export function Leaderboard({ onBack }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchLeaderboard()
      .then(setEntries)
      .catch(() => setError("Failed to load leaderboard"))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="screen leaderboard-screen">
      <h2 className="screen-title">leaderboard</h2>
      {loading && <p className="leaderboard-loading">loading...</p>}
      {error && <p className="leaderboard-error">{error}</p>}
      {!loading && !error && (
        <ol className="leaderboard">
          {entries.length === 0 ? (
            <li className="leaderboard-empty">no scores yet</li>
          ) : (
            entries.map((e, i) => (
              <li key={`${e.name}-${e.score}-${i}`} className="leaderboard-row">
                <span className="rank">{i + 1}</span>
                <span className="name">{e.name}</span>
                <span className="score">{e.score}</span>
              </li>
            ))
          )}
        </ol>
      )}
      <div className="screen-actions">
        <button type="button" onClick={onBack} className="btn btn-secondary">
          Back
        </button>
      </div>
    </div>
  )
}

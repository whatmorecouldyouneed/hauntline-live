import { useState, useEffect, useCallback } from "react"
import {
  fetchLeaderboard,
  type LeaderboardEntry,
} from "../../utils/leaderboard"
import { HapticButton } from "../../components/HapticButton"

interface LeaderboardProps {
  onBack: () => void
  currentPlayerName?: string
}

export function Leaderboard({ onBack, currentPlayerName }: LeaderboardProps) {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (isRefresh: boolean) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)
    setError(null)
    try {
      const data = await fetchLeaderboard()
      setEntries(data)
    } catch {
      setError("failed to load leaderboard")
    } finally {
      if (isRefresh) setRefreshing(false)
      else setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load(false)
  }, [load])

  const me = currentPlayerName?.trim().toLowerCase() ?? ""
  const busy = loading || refreshing

  return (
    <div className="screen leaderboard-screen">
      <h2 className="screen-title">leaderboard</h2>
      <div className="leaderboard-toolbar">
        <span className="leaderboard-count">
          {entries.length > 0 ? `top ${entries.length}` : ""}
        </span>
        <HapticButton
          type="button"
          className="leaderboard-refresh"
          onClick={() => void load(true)}
          disabled={busy}
          aria-label="refresh leaderboard"
          haptic="light"
        >
          {refreshing ? "refreshing…" : "refresh"}
        </HapticButton>
      </div>

      {loading && <p className="leaderboard-loading">loading…</p>}

      {error && !loading && (
        <div className="leaderboard-error-block">
          <p className="leaderboard-error">{error}</p>
          <HapticButton
            type="button"
            className="btn btn-secondary leaderboard-retry"
            onClick={() => void load(true)}
            disabled={busy}
          >
            try again
          </HapticButton>
        </div>
      )}

      {!loading && !error && (
        <div className="leaderboard-list-wrap" role="region" aria-label="leaderboard scroll">
          {entries.length === 0 ? (
            <p className="leaderboard-empty">no scores yet — go set one</p>
          ) : (
            <ol className="leaderboard">
              {entries.map((e, i) => {
                const rank = i + 1
                const isMe = !!me && e.name.trim().toLowerCase() === me
                const topClass =
                  rank === 1 ? "is-top1"
                  : rank === 2 ? "is-top2"
                  : rank === 3 ? "is-top3"
                  : ""
                const rowClass = [
                  "leaderboard-row",
                  topClass,
                  isMe ? "is-me" : "",
                ].filter(Boolean).join(" ")
                return (
                  <li key={`${e.name}-${e.score}-${i}`} className={rowClass}>
                    <span className="rank" aria-label={`rank ${rank}`}>
                      {rank}
                    </span>
                    <span className="name" title={e.name}>
                      {e.name}
                      {isMe && <span className="leaderboard-you"> · you</span>}
                    </span>
                    <span className="score">{e.score.toLocaleString()}</span>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      )}

      <div className="screen-actions">
        <HapticButton type="button" onClick={onBack} className="btn btn-secondary">
          Back
        </HapticButton>
      </div>
    </div>
  )
}

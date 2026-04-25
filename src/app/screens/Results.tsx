import { toScore } from "../../utils/score"
import type { Player } from "../../types/game"
import { HapticButton } from "../../components/HapticButton"

interface ResultsProps {
  players: Player[]
  onRematch: () => void
  onNewMatch: () => void
  onViewLeaderboard?: () => void
}

export function Results({
  players,
  onRematch,
  onNewMatch,
  onViewLeaderboard,
}: ResultsProps) {
  const sorted = [...players].sort((a, b) => b.bestMs - a.bestMs)

  return (
    <div className="screen results">
      <h2 className="screen-title">results</h2>
      <ol className="leaderboard">
        {sorted.map((p, i) => (
          <li key={i} className="leaderboard-row">
            <span className="rank">{i + 1}</span>
            <span className="name">{p.name}</span>
            <span className="score">{toScore(p.bestMs)}</span>
          </li>
        ))}
      </ol>
      <div className="screen-actions">
        {onViewLeaderboard && (
          <HapticButton
            type="button"
            onClick={onViewLeaderboard}
            className="btn btn-secondary"
          >
            Leaderboard
          </HapticButton>
        )}
        <HapticButton type="button" onClick={onNewMatch} className="btn btn-secondary">
          New Match
        </HapticButton>
        <HapticButton
          type="button"
          onClick={onRematch}
          className="btn btn-primary"
          haptic="success"
        >
          Rematch
        </HapticButton>
      </div>
    </div>
  )
}

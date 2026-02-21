export interface ResultPlayer {
  name: string
  bestMs: number
}

interface ResultsProps {
  players: ResultPlayer[]
  onRematch: () => void
  onNewMatch: () => void
}

function toScore(sec: number): number {
  return Math.floor(sec * 10)
}

export function Results({ players, onRematch, onNewMatch }: ResultsProps) {
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
        <button type="button" onClick={onNewMatch} className="btn btn-secondary">
          New Match
        </button>
        <button type="button" onClick={onRematch} className="btn btn-primary">
          Rematch
        </button>
      </div>
    </div>
  )
}

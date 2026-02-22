import { toScore } from "../../utils/score"

interface DeathProps {
  playerName: string
  timeSurvived: number
  onRetry: () => void
  onHome: () => void
}

export function Death({
  playerName,
  timeSurvived,
  onRetry,
  onHome,
}: DeathProps) {
  return (
    <div className="screen death">
      <p className="death-message">you died</p>
      <p className="death-player">{playerName}</p>
      <p className="death-score">score: {toScore(timeSurvived)}</p>
      <div className="screen-actions">
        <button type="button" onClick={onHome} className="btn btn-secondary">
          Home
        </button>
        <button type="button" onClick={onRetry} className="btn btn-primary">
          Retry
        </button>
      </div>
    </div>
  )
}

import { toScore } from "../../utils/score"

interface DeathProps {
  playerName: string
  timeSurvived: number
  onRetry: () => void
  onModeSelect: () => void
}

export function Death({
  playerName,
  timeSurvived,
  onRetry,
  onModeSelect,
}: DeathProps) {
  return (
    <div className="screen death">
      <p className="death-message">you died</p>
      <p className="death-player">{playerName}</p>
      <p className="death-score">score: {toScore(timeSurvived)}</p>
      <div className="screen-actions">
        <button type="button" onClick={onModeSelect} className="btn btn-secondary">
          Game Mode
        </button>
        <button type="button" onClick={onRetry} className="btn btn-primary">
          Retry
        </button>
      </div>
    </div>
  )
}

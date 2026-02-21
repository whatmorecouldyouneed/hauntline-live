import { toScore } from "../../utils/score"

interface DeathProps {
  playerName: string
  timeSurvived: number
  isLastPlayer: boolean
  nextPlayerName?: string
  onNextPlayer: () => void
  onRetry: () => void
  onSeeResults: () => void
}

export function Death({
  playerName,
  timeSurvived,
  isLastPlayer,
  nextPlayerName,
  onNextPlayer,
  onRetry,
  onSeeResults,
}: DeathProps) {
  return (
    <div className="screen death">
      <p className="death-message">you died</p>
      <p className="death-player">{playerName}</p>
      <p className="death-score">score: {toScore(timeSurvived)}</p>
      {!isLastPlayer && nextPlayerName && (
        <p className="death-handoff">pass the phone to {nextPlayerName}</p>
      )}
      <div className="screen-actions">
        <button type="button" onClick={onRetry} className="btn btn-secondary">
          Retry
        </button>
        {isLastPlayer ? (
          <button
            type="button"
            onClick={onSeeResults}
            className="btn btn-primary"
          >
            See Results
          </button>
        ) : (
          <button
            type="button"
            onClick={onNextPlayer}
            className="btn btn-primary"
          >
            Next Player
          </button>
        )}
      </div>
    </div>
  )
}

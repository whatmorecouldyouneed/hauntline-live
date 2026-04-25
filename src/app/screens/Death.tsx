import { useEffect } from "react"
import { toScore } from "../../utils/score"
import { submitScore } from "../../utils/leaderboard"
import { HapticButton } from "../../components/HapticButton"

interface DeathProps {
  playerName: string
  timeSurvived: number
  onRetry: () => void
  onModeSelect: () => void
  onViewLeaderboard?: () => void
}

export function Death({
  playerName,
  timeSurvived,
  onRetry,
  onModeSelect,
  onViewLeaderboard,
}: DeathProps) {
  useEffect(() => {
    if (playerName.trim()) {
      submitScore(playerName.trim(), toScore(timeSurvived)).catch(() => {})
    }
  }, [playerName, timeSurvived])

  return (
    <div className="screen death">
      <p className="death-message">you died</p>
      <p className="death-player">{playerName}</p>
      <p className="death-score">score: {toScore(timeSurvived)}</p>
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
        <HapticButton type="button" onClick={onModeSelect} className="btn btn-secondary">
          Game Mode
        </HapticButton>
        <HapticButton
          type="button"
          onClick={onRetry}
          className="btn btn-primary"
          haptic="success"
        >
          Retry
        </HapticButton>
      </div>
    </div>
  )
}

import { HapticButton } from "../../components/HapticButton"

interface ModeSelectProps {
  playerName: string
  onSinglePlayer: () => void
  onSinglePlayerAR: () => void
  onCreateRoom: () => void
  onJoinRoom: () => void
  onBack: () => void
}

export function ModeSelect({
  playerName,
  onSinglePlayer,
  onSinglePlayerAR,
  onCreateRoom,
  onJoinRoom,
  onBack,
}: ModeSelectProps) {
  return (
    <div className="screen mode-select">
      <p className="mode-player-name">{playerName}</p>
      <div className="mode-buttons">
        <HapticButton type="button" onClick={onSinglePlayer} className="btn btn-primary mode-btn">
          Single Player
        </HapticButton>
        <HapticButton type="button" onClick={onSinglePlayerAR} className="btn btn-primary mode-btn">
          Single Player (AR)
        </HapticButton>
        <HapticButton type="button" onClick={onCreateRoom} className="btn btn-primary mode-btn">
          Create Room
        </HapticButton>
        <HapticButton type="button" onClick={onJoinRoom} className="btn btn-primary mode-btn">
          Join Room
        </HapticButton>
      </div>
      <HapticButton type="button" onClick={onBack} className="btn btn-secondary">
        Back
      </HapticButton>
    </div>
  )
}

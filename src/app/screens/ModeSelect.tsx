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
        <button type="button" onClick={onSinglePlayer} className="btn btn-primary mode-btn">
          Single Player
        </button>
        <button type="button" onClick={onSinglePlayerAR} className="btn btn-primary mode-btn">
          Single Player (AR)
        </button>
        <button type="button" onClick={onCreateRoom} className="btn btn-primary mode-btn">
          Create Room
        </button>
        <button type="button" onClick={onJoinRoom} className="btn btn-primary mode-btn">
          Join Room
        </button>
      </div>
      <button type="button" onClick={onBack} className="btn btn-secondary">
        Back
      </button>
    </div>
  )
}

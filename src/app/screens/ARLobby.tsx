import type { ARPlayerSlot } from "../../types/ar"

interface ARLobbyProps {
  players: ARPlayerSlot[]
  localReady: boolean
  onReady: () => void
  onRecenter: () => void
  countdown: number | null
  singlePlayerAR?: boolean
}

export function ARLobby({
  players,
  localReady,
  onReady,
  onRecenter,
  countdown,
  singlePlayerAR = false,
}: ARLobbyProps) {
  const detected = players.filter((p) => p.detected)

  if (countdown !== null) {
    return (
      <div
        className={`ar-overlay ar-countdown ${singlePlayerAR ? "ar-countdown-solo" : ""}`}
      >
        <span className="countdown-number">{countdown}</span>
      </div>
    )
  }

  return (
    <div className="ar-overlay ar-lobby">
      <div className="ar-player-cards">
        {detected.map((p) => (
          <div
            key={p.targetIndex}
            className={`ar-player-card ${p.ready ? "ready" : ""}`}
            style={{
              borderColor: `#${p.color.toString(16).padStart(6, "0")}`,
            }}
          >
            <span
              className="card-color-dot"
              style={{
                backgroundColor: `#${p.color.toString(16).padStart(6, "0")}`,
              }}
            />
            <span className="card-label">{p.label}</span>
            <span className="card-name">{p.name || "..."}</span>
            <span className="card-status">{p.ready ? "ready" : "waiting"}</span>
          </div>
        ))}
      </div>

      {!localReady && detected.length > 0 && (
        <div className="ar-lobby-actions">
          <button type="button" onClick={onReady} className="btn btn-primary ar-lobby-btn">
            Ready
          </button>
          <button type="button" onClick={onRecenter} className="btn btn-secondary ar-lobby-btn">
            Recenter
          </button>
        </div>
      )}

      {localReady && (
        <p className="ar-waiting-text">waiting for others...</p>
      )}
    </div>
  )
}

import type { ARPlayerSlot } from "../../types/ar"
import { HapticButton } from "../../components/HapticButton"

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
  // multiplayer: show all players in room (from server); single-player: only detected marker
  const visible =
    singlePlayerAR
      ? players.filter((p) => p.detected)
      : players.filter((p) => p.detected || p.name)
  const totalPlayers = visible.length
  const readyCount = visible.filter((p) => p.ready).length

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
      {!singlePlayerAR && (
        <p className="ar-lobby-rules">
          everyone must ready. when you die, spectate until all players are out.
        </p>
      )}
      {!singlePlayerAR && totalPlayers > 0 && (
        <p className="ar-lobby-ready-count">
          {readyCount}/{totalPlayers} players ready
        </p>
      )}
      <div className="ar-player-cards">
        {visible.map((p) => (
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

      {!localReady && visible.length > 0 && (
        <div className="ar-lobby-actions">
          <HapticButton
            type="button"
            onClick={onReady}
            className="btn btn-primary ar-lobby-btn"
            haptic="success"
          >
            Ready
          </HapticButton>
          <HapticButton
            type="button"
            onClick={onRecenter}
            className="btn btn-secondary ar-lobby-btn"
          >
            Recenter
          </HapticButton>
        </div>
      )}

      {localReady && (
        <p className="ar-waiting-text">waiting for others...</p>
      )}
    </div>
  )
}

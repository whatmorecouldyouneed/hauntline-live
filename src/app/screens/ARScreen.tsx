import { useState, useCallback } from "react"
import { ARViewer, type MarkerState } from "../../game/ARViewer"

interface ARScreenProps {
  onBack: () => void
}

export function ARScreen({ onBack }: ARScreenProps) {
  const [markers, setMarkers] = useState<MarkerState[]>([])

  const handleMarkersUpdate = useCallback((updated: MarkerState[]) => {
    setMarkers(updated)
  }, [])

  const detectedCount = markers.filter((m) => m.detected).length

  return (
    <div className="screen ar-screen">
      <ARViewer onMarkersUpdate={handleMarkersUpdate} />

      {/* marker status HUD */}
      <div className="ar-marker-hud">
        {markers.map((m) => (
          <div
            key={m.targetIndex}
            className={`marker-slot ${m.detected ? "detected" : ""}`}
            style={{
              borderColor: `#${m.color.toString(16).padStart(6, "0")}`,
            }}
          >
            <span className="marker-label">{m.label}</span>
            <span className="marker-status">
              {m.detected ? "found" : "..."}
            </span>
          </div>
        ))}
      </div>

      {/* TODO: ready-up flow for multiplayer */}
      {detectedCount > 0 && (
        <div className="ar-ready-bar">
          <p className="ar-ready-text">
            {detectedCount} player{detectedCount !== 1 ? "s" : ""} detected
          </p>
          {/* TODO: "Ready" button per player, "Start" when all ready */}
        </div>
      )}

      <button
        type="button"
        onClick={onBack}
        className="btn btn-secondary ar-back-btn"
      >
        Back
      </button>
    </div>
  )
}

import { useState, useCallback } from "react"

interface ARHowToPlayProps {
  onPlay: () => void
  onBack: () => void
}

// P1=green, P2=red, P3=blue, P4=purple
const MARKERS = [
  { src: "/ghost-player-one.JPEG", label: "Wisp", color: "#00ff88" },
  { src: "/ghost-player-two.JPEG", label: "Spark", color: "#ff6644" },
  { src: "/ghost-player-three.JPEG", label: "Classic", color: "#44aaff" },
  { src: "/ghost-player-four.JPEG", label: "Wraith", color: "#9966ff" },
] as const

type CameraStatus = "idle" | "requesting" | "granted" | "denied"

export function ARHowToPlay({ onPlay, onBack }: ARHowToPlayProps) {
  const [cameraStatus, setCameraStatus] = useState<CameraStatus>("idle")

  const handleAllowCamera = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus("denied")
      return
    }
    setCameraStatus("requesting")
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true })
      stream.getTracks().forEach((t) => t.stop())
      setCameraStatus("granted")
    } catch {
      setCameraStatus("denied")
    }
  }, [])

  const canPlay = cameraStatus === "granted"

  return (
    <div className="screen ar-how-to-play">
      <h2 className="screen-title">how to play in AR</h2>
      <p className="ar-how-to-play-instructions">
        To play solo in augmented reality, place one of these markers on a table. Click to download and print, then point your camera at a
        marker to start.
      </p>
      <div className="ar-marker-grid">
        {MARKERS.map(({ src, label, color }) => (
          <a
            key={src}
            href={src}
            download
            className="ar-marker-card"
            target="_blank"
            rel="noreferrer"
          >
            <img src={src} alt={label} className="ar-marker-image" />
            <span className="ar-marker-label" style={{ color }}>{label}</span>
          </a>
        ))}
      </div>
      <button
        type="button"
        onClick={handleAllowCamera}
        className="btn btn-secondary ar-camera-btn"
        disabled={cameraStatus === "requesting" || cameraStatus === "granted"}
      >
        {cameraStatus === "requesting"
          ? "Requesting..."
          : cameraStatus === "granted"
            ? "Camera access granted"
            : cameraStatus === "denied"
              ? "Camera access denied"
              : "Allow Camera Access"}
      </button>
      <div className="screen-actions ar-how-to-play-actions">
        <button type="button" onClick={onBack} className="btn btn-secondary">
          Back
        </button>
        <button
          type="button"
          onClick={onPlay}
          className="btn btn-primary"
          disabled={!canPlay}
        >
          Play
        </button>
      </div>
    </div>
  )
}

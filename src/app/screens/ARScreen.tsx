import { useState, useCallback, useEffect, useRef } from "react"
import { ARExperience } from "../../game/ARExperience"
import { ARLobby } from "./ARLobby"
import type { MarkerState } from "../../game/ARViewer"
import { GHOST_COLORS } from "../../game/meshes"
import { toScore } from "../../utils/score"
import type { ARPlayerSlot, ARPhase } from "../../types/ar"

const PLAYER_LABELS = ["P1", "P2", "P3", "P4"]
const NUM_SLOTS = 4

function createSlots(playerName: string, singlePlayerAR: boolean): ARPlayerSlot[] {
  const n = singlePlayerAR ? 1 : NUM_SLOTS
  return Array.from({ length: n }, (_, i) => ({
    targetIndex: i,
    label: PLAYER_LABELS[i],
    color: GHOST_COLORS[i],
    detected: false,
    ready: false,
    alive: true,
    score: 0,
    name: i === 0 ? playerName : "",
  }))
}

interface ARScreenProps {
  playerName: string
  roomCode: string | null
  singlePlayerAR?: boolean
  onBack: () => void
}

export function ARScreen({
  playerName,
  roomCode,
  singlePlayerAR = false,
  onBack,
}: ARScreenProps) {
  const [phase, setPhase] = useState<ARPhase>("scanning")
  const [slots, setSlots] = useState<ARPlayerSlot[]>(() =>
    createSlots(playerName, singlePlayerAR)
  )
  const [localReady, setLocalReady] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [gameSeed] = useState(() => Date.now())
  const [rematchKey, setRematchKey] = useState(0)
  const [recenterSignal, setRecenterSignal] = useState(0)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const handleMarkersUpdate = useCallback(
    (markers: MarkerState[]) => {
      const anyDetected = markers.some((m) => m.detected)
      setSlots((prev) =>
        prev.map((slot) => {
          const marker = markers.find((m) => m.targetIndex === slot.targetIndex)
          return marker ? { ...slot, detected: marker.detected } : slot
        })
      )
      if (anyDetected) {
        setPhase((p) => {
          if (p !== "scanning") return p
          return "lobby"
        })
      }
    },
    [singlePlayerAR]
  )

  const handleRecenter = useCallback(() => {
    setRecenterSignal((n) => n + 1)
  }, [])

  const handleReady = useCallback(() => {
    setLocalReady(true)
    // TODO: with networking, broadcast ready message instead
    setSlots((prev) => {
      const next = prev.map((s, i) => (i === 0 ? { ...s, ready: true } : s))
      const detected = next.filter((s) => s.detected)
      if (detected.length > 0 && detected.every((s) => s.ready)) {
        setPhase("countdown")
        setCountdown(3)
      }
      return next
    })
  }, [])

  // countdown timer
  useEffect(() => {
    if (phase !== "countdown") return
    countdownRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(countdownRef.current!)
          setPhase("playing")
          return null
        }
        return prev - 1
      })
    }, 1000)
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
    }
  }, [phase])

  const handlePlayerDeath = useCallback((targetIndex: number, score: number) => {
    setSlots((prev) => {
      const next = prev.map((s) =>
        s.targetIndex === targetIndex ? { ...s, alive: false, score } : s
      )
      // if all detected players are dead, go to results
      const detected = next.filter((s) => s.detected)
      if (detected.length > 0 && detected.every((s) => !s.alive)) {
        setPhase("results")
      }
      return next
    })
  }, [])

  const handleScoreUpdate = useCallback((targetIndex: number, score: number) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.targetIndex === targetIndex ? { ...s, score } : s
      )
    )
  }, [])

  const handleRematch = useCallback(() => {
    setSlots((prev) =>
      prev.map((s) => ({ ...s, alive: true, score: 0, ready: false }))
    )
    setLocalReady(false)
    setRematchKey((k) => k + 1)
    setCountdown(null)
    setPhase("lobby")
  }, [singlePlayerAR])

  const detectedCount = slots.filter((s) => s.detected).length

  return (
    <div className="screen ar-screen">
      {/* single MindAR session from scan through game + results (no re-scan) */}
      {(phase === "scanning" ||
        phase === "lobby" ||
        phase === "countdown" ||
        phase === "playing" ||
        phase === "results") && (
        <ARExperience
          key={rematchKey}
          phase={phase}
          onMarkersUpdate={handleMarkersUpdate}
          seed={gameSeed}
          onPlayerDeath={handlePlayerDeath}
          onScoreUpdate={handleScoreUpdate}
          playerSlots={slots}
          recenterSignal={recenterSignal}
        />
      )}

      {/* results overlay on top of frozen game */}

      {roomCode && (
        <div className="ar-room-code">
          <span className="room-code-label">room</span>
          <span className="room-code-value">{roomCode}</span>
        </div>
      )}

      {/* marker HUD - hide for single player AR (less clutter) */}
      {phase !== "results" && !singlePlayerAR && (
        <div className="ar-marker-hud">
          {slots.map((s) => (
            <div
              key={s.targetIndex}
              className={`marker-slot ${s.detected ? "detected" : ""}`}
              style={{
                borderColor: `#${s.color.toString(16).padStart(6, "0")}`,
              }}
            >
              <span className="marker-label">{s.label}</span>
              <span className="marker-status">
                {phase === "playing"
                  ? s.alive
                    ? toScore(s.score).toString()
                    : "dead"
                  : s.detected
                    ? "found"
                    : "..."}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* phase overlays */}
      {phase === "scanning" && detectedCount === 0 && (
        <div className="ar-scanning-overlay">
          <p>{singlePlayerAR ? "point at a marker to start" : "scanning for markers..."}</p>
        </div>
      )}

      {(phase === "lobby" || phase === "countdown") && (
        <ARLobby
          players={slots}
          localReady={localReady}
          onReady={handleReady}
          onRecenter={handleRecenter}
          countdown={countdown}
          singlePlayerAR={singlePlayerAR}
        />
      )}

      {phase === "playing" && (
        <div className="ar-playing-score">
          <span className="hud-score">{toScore(slots[0]?.score ?? 0)}</span>
        </div>
      )}

      {phase === "results" && (
        <div className="ar-overlay ar-results">
          <h2 className="screen-title">results</h2>
          <div className="ar-results-list">
            {slots
              .filter((s) => s.detected)
              .sort((a, b) => b.score - a.score)
              .map((s, i) => (
                <div key={s.targetIndex} className="ar-result-row">
                  <span className="rank">{i + 1}</span>
                  <span className="name">{s.name || s.label}</span>
                  <span className="score">{toScore(s.score)}</span>
                </div>
              ))}
          </div>
          <div className="screen-actions">
            <button type="button" onClick={handleRematch} className="btn btn-primary">
              Rematch
            </button>
            <button type="button" onClick={onBack} className="btn btn-secondary">
              Home
            </button>
          </div>
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

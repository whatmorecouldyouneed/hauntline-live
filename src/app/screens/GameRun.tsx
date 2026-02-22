import { useState, useEffect, useRef } from "react"
import { GameCanvas } from "../../game/GameCanvas"
import { startBgm } from "../../utils/audio"
import { toScore } from "../../utils/score"
import { GHOST_COLORS } from "../../game/meshes"
import { INTRO_DURATION_MS } from "../../game/introAnim"
import type { CharacterIndex } from "../../game/meshes"

const COUNTDOWN_MS = 3000

interface GameRunProps {
  onDeath: (elapsed: number) => void
  characterIndex?: CharacterIndex
}

export function GameRun({ onDeath, characterIndex = 0 }: GameRunProps) {
  const [elapsed, setElapsed] = useState(0)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [started, setStarted] = useState(false)
  const [paused, setPaused] = useState(false)
  const [nowMs, setNowMs] = useState(0)
  const [introState, setIntroState] = useState(() => ({
    startMs: performance.now(),
    nonce: performance.now(),
  }))
  const hasStartedRef = useRef(false)

  useEffect(() => {
    startBgm()
  }, [])

  // single RAF tick for timestamp-driven countdown
  useEffect(() => {
    let raf: number
    const tick = () => {
      const now = performance.now()
      setNowMs(now)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  useEffect(() => {
    if (paused || hasStartedRef.current) return
    const introStartMs = introState.startMs
    const countdownStartMs = introStartMs + INTRO_DURATION_MS
    const playStartMs = countdownStartMs + COUNTDOWN_MS

    if (nowMs >= playStartMs) {
      if (!hasStartedRef.current) {
        hasStartedRef.current = true
        setStarted(true)
        setCountdown(null)
      }
      return
    }

    if (nowMs < countdownStartMs) {
      setCountdown(null)
      return
    }

    const remaining = Math.ceil((playStartMs - nowMs) / 1000)
    setCountdown(Math.max(1, remaining))
  }, [nowMs, paused, introState.startMs])

  const handlePause = () => {
    if (paused) {
      setPaused(false)
      const now = performance.now()
      setIntroState({ startMs: now, nonce: now })
      hasStartedRef.current = false
      setStarted(false)
      setCountdown(3)
    } else {
      setPaused(true)
      setStarted(false)
    }
  }

  const accentColor = `#${GHOST_COLORS[characterIndex].toString(16).padStart(6, "0")}`

  return (
    <div
      className="screen game-run"
      style={{ "--game-accent": accentColor } as React.CSSProperties}
    >
      <GameCanvas
        onDeath={onDeath}
        onElapsed={setElapsed}
        characterIndex={characterIndex}
        started={started}
        introNonce={introState.nonce}
        introStartMs={introState.startMs}
      />
      {countdown !== null && (
        <div className="game-countdown-overlay" role="timer" aria-live="polite">
          <span className="game-countdown-number">{countdown}</span>
        </div>
      )}
      {paused && (
        <div className="ar-overlay game-paused-overlay">
          <p className="game-paused-text">paused</p>
        </div>
      )}
      {(started || paused) && (
        <div className="game-hud-row">
          <div className="game-hud-spacer" aria-hidden />
          <div className="game-hud">
            {started && (
              <span className="game-hud-score">{toScore(elapsed)}</span>
            )}
          </div>
          <button
            type="button"
            className="game-pause-btn"
            onClick={handlePause}
            aria-label={paused ? "resume" : "pause"}
          >
            {paused ? (
              <svg className="game-pause-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            ) : (
              <svg className="game-pause-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            )}
          </button>
        </div>
      )}
    </div>
  )
}

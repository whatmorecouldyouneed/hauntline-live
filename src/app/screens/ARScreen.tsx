import { useState, useCallback, useEffect, useRef } from "react"
import { ARExperience } from "../../game/ARExperience"
import { ARLobby } from "./ARLobby"
import { useRoom } from "../../hooks/useRoom"
import type { MarkerState } from "../../game/ARViewer"
import { GHOST_COLORS } from "../../game/meshes"
import { toScore } from "../../utils/score"
import { submitScore } from "../../utils/leaderboard"
import { INTRO_DURATION_MS } from "../../game/introAnim"
import type { ARPlayerSlot, ARPhase } from "../../types/ar"

const PLAYER_LABELS = ["P1", "P2", "P3", "P4"]
const NUM_SLOTS = 4
const COUNTDOWN_MS = 3000

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
  onViewLeaderboard?: () => void
}

const PLAY_START_DELAY_MS = INTRO_DURATION_MS + COUNTDOWN_MS

function mergeServerStateIntoSlots(
  slots: ARPlayerSlot[],
  roomState: { players: Record<string, { targetIndex: number; name: string; ready: boolean; alive: boolean; score: number }> } | null
): ARPlayerSlot[] {
  if (!roomState) return slots
  return slots.map((slot) => {
    const player = Object.values(roomState.players).find(
      (p) => p.targetIndex === slot.targetIndex
    )
    return player
      ? {
          ...slot,
          name: player.name,
          ready: player.ready,
          alive: player.alive,
          score: player.score,
        }
      : slot
  })
}

export function ARScreen({
  playerName,
  roomCode,
  singlePlayerAR = false,
  onBack,
  onViewLeaderboard,
}: ARScreenProps) {
  const { connected, roomState, send, lastEvent } = useRoom(
    !singlePlayerAR && roomCode ? roomCode : null
  )
  const [phase, setPhase] = useState<ARPhase>("scanning")
  const [slots, setSlots] = useState<ARPlayerSlot[]>(() =>
    createSlots(playerName, singlePlayerAR)
  )
  const [localReady, setLocalReady] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [introStartMs, setIntroStartMs] = useState<number | null>(null)
  const [serverStartTime, setServerStartTime] = useState<number | null>(null)
  const [nowMs, setNowMs] = useState(0)
  const [gameSeed, setGameSeed] = useState(() => Date.now())
  const [rematchKey, setRematchKey] = useState(0)
  const [recenterSignal, setRecenterSignal] = useState(0)
  const hasIntroEndedRef = useRef(false)
  const hasPlayingStartedRef = useRef(false)
  const hasSubmittedScoreRef = useRef(false)
  const remoteJumpsRef = useRef<Set<number>>(new Set())
  const lastJoinTargetRef = useRef<number | null>(null)

  const handleJump = useCallback(() => {
    if (!singlePlayerAR && roomCode) send({ type: "jump" })
  }, [singlePlayerAR, roomCode, send])
  // merge server state into slots when in multiplayer
  useEffect(() => {
    if (singlePlayerAR || !roomState) return
    setSlots((prev) => mergeServerStateIntoSlots(prev, roomState))
  }, [singlePlayerAR, roomState])

  // sync phase from server (lobby, results) in multiplayer
  useEffect(() => {
    if (singlePlayerAR || !roomState) return
    if (roomState.phase === "lobby" && phase !== "introAnim" && phase !== "countdown" && phase !== "playing") {
      setPhase("lobby")
    }
    if (roomState.phase === "results") {
      setPhase("results")
    }
  }, [singlePlayerAR, roomState?.phase, phase])

  // send join when connected and have a detected marker (multiplayer)
  useEffect(() => {
    if (singlePlayerAR || !connected || !roomCode) return
    const detectedSlot = slots.find((s) => s.detected)
    if (!detectedSlot) return
    const ti = detectedSlot.targetIndex
    if (lastJoinTargetRef.current !== ti) {
      lastJoinTargetRef.current = ti
      send({ type: "join", name: playerName.trim() || "Ghost", targetIndex: ti })
    }
  }, [singlePlayerAR, connected, roomCode, playerName, slots, send])

  // handle server events: start, playerJump, playerDeath
  useEffect(() => {
    if (!lastEvent || singlePlayerAR) return
    if (lastEvent.type === "start") {
      setGameSeed(lastEvent.seed)
      setIntroStartMs(performance.now())
      setServerStartTime(lastEvent.startTime)
      hasIntroEndedRef.current = false
      hasPlayingStartedRef.current = false
      setPhase("introAnim")
    }
    if (lastEvent.type === "playerJump" && roomState?.players[lastEvent.playerId]) {
      const ti = roomState.players[lastEvent.playerId].targetIndex
      remoteJumpsRef.current.add(ti)
    }
    if (lastEvent.type === "playerDeath" && roomState?.players[lastEvent.playerId]) {
      const ti = roomState.players[lastEvent.playerId].targetIndex
      setSlots((prev) =>
        prev.map((s) =>
          s.targetIndex === ti ? { ...s, alive: false, score: lastEvent.score } : s
        )
      )
    }
  }, [lastEvent, singlePlayerAR, roomState])

  const handleMarkersUpdate = useCallback(
    (markers: MarkerState[]) => {
      const anyDetected = markers.some((m) => m.detected)
      setSlots((prev) => {
        if (singlePlayerAR && prev.length === 1) {
          const firstDetected = markers.find((m) => m.detected)
          const slot = prev[0]
          if (firstDetected) {
            lastJoinTargetRef.current = null
            return [{
              ...slot,
              targetIndex: firstDetected.targetIndex,
              label: PLAYER_LABELS[firstDetected.targetIndex],
              color: GHOST_COLORS[firstDetected.targetIndex],
              detected: true,
            }]
          }
          return [{ ...slot, detected: false }]
        }
        return prev.map((slot) => {
          const marker = markers.find((m) => m.targetIndex === slot.targetIndex)
          return marker ? { ...slot, detected: marker.detected } : slot
        })
      })
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
    if (!singlePlayerAR && roomCode) {
      send({ type: "ready" })
    }
    setSlots((prev) => {
      const next = prev.map((s, i) => (i === 0 ? { ...s, ready: true } : s))
      const detected = next.filter((s) => s.detected)
      const readyToStart = detected.length > 0 && detected.every((s) => s.ready)
      if (readyToStart && singlePlayerAR) {
        const now = performance.now()
        hasIntroEndedRef.current = false
        hasPlayingStartedRef.current = false
        setPhase("introAnim")
        setIntroStartMs(now)
      }
      return next
    })
  }, [singlePlayerAR, roomCode, send])

  // single RAF tick for timestamp-driven intro/countdown (use Date.now() for server-synced multiplayer)
  useEffect(() => {
    if (phase !== "introAnim" && phase !== "countdown") return
    let raf: number
    const useServerTick = !singlePlayerAR && serverStartTime !== null
    const tick = () => {
      setNowMs(useServerTick ? Date.now() : performance.now())
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [phase, singlePlayerAR, serverStartTime])

  // derive phase transitions and countdown display from timestamps
  useEffect(() => {
    if (phase !== "introAnim" && phase !== "countdown") return

    const useServerTiming = !singlePlayerAR && serverStartTime !== null
    const playStartMs = useServerTiming
      ? serverStartTime! + PLAY_START_DELAY_MS
      : (introStartMs ?? 0) + PLAY_START_DELAY_MS
    const now = useServerTiming ? Date.now() : nowMs

    if (phase === "introAnim") {
      const threshold = useServerTiming ? serverStartTime! + INTRO_DURATION_MS : (introStartMs ?? 0) + INTRO_DURATION_MS
      if (now >= threshold && !hasIntroEndedRef.current) {
        hasIntroEndedRef.current = true
        setPhase("countdown")
      }
    }

    if (phase === "countdown") {
      const remaining = Math.ceil((playStartMs - now) / 1000)
      setCountdown(Math.max(1, remaining))

      if (now >= playStartMs) {
        if (!hasPlayingStartedRef.current) {
          hasPlayingStartedRef.current = true
          setPhase("playing")
          setCountdown(null)
        }
      }
    }
  }, [phase, nowMs, introStartMs, singlePlayerAR, serverStartTime])

  const handlePlayerDeath = useCallback(
    (targetIndex: number, scoreSeconds: number) => {
      if (!singlePlayerAR && roomCode) {
        send({ type: "death", score: scoreSeconds })
      }
      setSlots((prev) => {
        const next = prev.map((s) =>
          s.targetIndex === targetIndex ? { ...s, alive: false, score: scoreSeconds } : s
        )
        const detected = next.filter((s) => s.detected)
        if (detected.length > 0 && detected.every((s) => !s.alive)) {
          setPhase("results")
        }
        return next
      })
    },
    [singlePlayerAR, roomCode, send]
  )

  const handleScoreUpdate = useCallback((targetIndex: number, score: number) => {
    setSlots((prev) =>
      prev.map((s) =>
        s.targetIndex === targetIndex ? { ...s, score } : s
      )
    )
  }, [])

  const handleRematch = useCallback(() => {
    hasSubmittedScoreRef.current = false
    lastJoinTargetRef.current = null
    if (!singlePlayerAR && roomCode) {
      send({ type: "rematch" })
    }
    setSlots((prev) =>
      prev.map((s) => ({ ...s, alive: true, score: 0, ready: false }))
    )
    setLocalReady(false)
    setRematchKey((k) => k + 1)
    setCountdown(null)
    setIntroStartMs(null)
    setServerStartTime(null)
    setPhase("lobby")
    hasIntroEndedRef.current = false
    hasPlayingStartedRef.current = false
  }, [singlePlayerAR, roomCode, send])

  useEffect(() => {
    if (phase !== "results" || hasSubmittedScoreRef.current) return
    const localSlot = slots[0]
    if (localSlot?.name?.trim()) {
      hasSubmittedScoreRef.current = true
      submitScore(localSlot.name.trim(), toScore(localSlot.score)).catch(() => {})
    }
  }, [phase, slots])

  const detectedCount = slots.filter((s) => s.detected).length

  return (
    <div className="screen ar-screen">
      {(phase === "scanning" ||
        phase === "lobby" ||
        phase === "introAnim" ||
        phase === "countdown" ||
        phase === "playing" ||
        phase === "results") && (
        <ARExperience
          key={rematchKey}
          phase={phase}
          introStartMs={introStartMs}
          onMarkersUpdate={handleMarkersUpdate}
          seed={gameSeed}
          onPlayerDeath={handlePlayerDeath}
          onScoreUpdate={handleScoreUpdate}
          playerSlots={slots}
          recenterSignal={recenterSignal}
          remoteJumpsRef={!singlePlayerAR ? remoteJumpsRef : undefined}
          onJump={!singlePlayerAR ? handleJump : undefined}
        />
      )}

      {roomCode && (
        <div className="ar-room-code">
          <span className="room-code-label">room</span>
          <span className="room-code-value">{roomCode}</span>
        </div>
      )}

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
              .filter((s) => s.detected || s.name)
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
            {onViewLeaderboard && (
              <button
                type="button"
                onClick={onViewLeaderboard}
                className="btn btn-secondary"
              >
                Leaderboard
              </button>
            )}
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

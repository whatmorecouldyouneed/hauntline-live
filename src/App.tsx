import { useState, useCallback, useEffect } from "react"
import { AudioProvider, useAudio } from "./context/AudioContext"
import { HapticButton } from "./components/HapticButton"
import { DesktopGate } from "./app/screens/DesktopGate"
import { preloadCharacterSelectAssets } from "./game/characterSelectAssets"
import { Home } from "./app/screens/Home"
import { NameInput } from "./app/screens/NameInput"
import { ModeSelect } from "./app/screens/ModeSelect"
import { CharacterSelect } from "./app/screens/CharacterSelect"
import { JoinRoom } from "./app/screens/JoinRoom"
import { GameRun } from "./app/screens/GameRun"
import { Death } from "./app/screens/Death"
import { Results } from "./app/screens/Results"
import { Leaderboard } from "./app/screens/Leaderboard"
import { ARHowToPlay } from "./app/screens/ARHowToPlay"
import { ARScreen } from "./app/screens/ARScreen"
import type { Player } from "./types/game"
import type { CharacterIndex } from "./game/meshes"
import "./App.css"

function GlobalMuteButton() {
  const audio = useAudio()
  if (!audio) return null
  return (
    <HapticButton
      type="button"
      onClick={audio.toggleMuted}
      className="btn btn-secondary global-mute-btn"
      aria-label={audio.muted ? "unmute" : "mute"}
      haptic="light"
    >
      {audio.muted ? (
        <svg className="mute-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zM16.59 12L14 9.41 15.41 8 18 10.59 20.59 8 22 9.41 19.41 12 22 14.59 20.59 16 18 13.41 15.41 16 14 14.59 16.59 12z" />
        </svg>
      ) : (
        <svg className="mute-icon" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
        </svg>
      )}
    </HapticButton>
  )
}

type Screen =
  | "home"
  | "name"
  | "modeSelect"
  | "characterSelect"
  | "game"
  | "death"
  | "joinRoom"
  | "arHowToPlay"
  | "ar"
  | "results"
  | "leaderboard"

const PLAYER_NAME_KEY = "hauntline-player-name"

function getStoredPlayerName(): string {
  try {
    return localStorage.getItem(PLAYER_NAME_KEY) ?? ""
  } catch {
    return ""
  }
}

function setStoredPlayerName(name: string): void {
  try {
    localStorage.setItem(PLAYER_NAME_KEY, name.trim())
  } catch {
    // ignore
  }
}

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  let code = ""
  for (let i = 0; i < 4; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export default function App() {
  const [screen, setScreen] = useState<Screen>("home")
  const [playerName, setPlayerName] = useState(getStoredPlayerName)
  const [roomCode, setRoomCode] = useState<string | null>(null)
  const [lastScore, setLastScore] = useState(0)
  const [characterIndex, setCharacterIndex] = useState<CharacterIndex>(0)

  // used for results screen in single player
  const [players, setPlayers] = useState<Player[]>([])

  const goHome = useCallback(() => {
    setScreen("home")
    setRoomCode(null)
    setLastScore(0)
    setPlayers([])
  }, [])

  const goToLeaderboard = useCallback(() => {
    setScreen("leaderboard")
  }, [])

  const goToModeSelect = useCallback(() => {
    setScreen("modeSelect")
    setRoomCode(null)
    setLastScore(0)
    setPlayers([])
  }, [])

  const goToNameScreen = useCallback(() => {
    setScreen("name")
  }, [])

  const goName = useCallback(() => {
    if (playerName.trim()) {
      setScreen("modeSelect")
    } else {
      setScreen("name")
    }
  }, [playerName])

  const handleNameSubmit = useCallback((name: string) => {
    const trimmed = name.trim()
    setPlayerName(trimmed)
    setStoredPlayerName(trimmed)
    setScreen("modeSelect")
  }, [])

  const goSinglePlayer = useCallback(() => {
    setScreen("characterSelect")
  }, [])

  const goSinglePlayerAR = useCallback(() => {
    setRoomCode(null)
    setScreen("arHowToPlay")
  }, [])

  const goToARScreen = useCallback(() => {
    setScreen("ar")
  }, [])

  const goToGameWithCharacter = useCallback((idx: CharacterIndex) => {
    setCharacterIndex(idx)
    setPlayers([{ name: playerName, bestMs: 0 }])
    setScreen("game")
  }, [playerName])

  const goBackFromCharacterSelect = useCallback(() => {
    setScreen("modeSelect")
  }, [])

  const goCreateRoom = useCallback(() => {
    const code = generateRoomCode()
    setRoomCode(code)
    setScreen("ar")
  }, [])

  const goJoinRoom = useCallback(() => {
    setScreen("joinRoom")
  }, [])

  const handleJoinRoom = useCallback((code: string) => {
    setRoomCode(code)
    setScreen("ar")
  }, [])

  const handleRetry = useCallback(() => {
    setPlayers([{ name: playerName, bestMs: 0 }])
    setScreen("game")
  }, [playerName])

  const handleDeath = useCallback((elapsed: number) => {
    setLastScore(elapsed)
    setPlayers([{ name: playerName, bestMs: elapsed }])
    setScreen("death")
  }, [playerName])

  const handleRematch = useCallback(() => {
    setPlayers((prev) => prev.map((p) => ({ ...p, bestMs: 0 })))
    setScreen("ar")
  }, [])

  useEffect(() => {
    if (screen === "modeSelect") preloadCharacterSelectAssets()
  }, [screen])

  return (
    <AudioProvider>
      <div className={screen === "ar" ? "has-top-back" : ""}>
        <GlobalMuteButton />
        <DesktopGate>
        <div className="app">
        {screen === "home" && (
          <Home onPlay={goName} onViewLeaderboard={goToLeaderboard} />
        )}
        {screen === "name" && (
          <NameInput
            initialName={playerName}
            onSubmit={handleNameSubmit}
            onBack={goHome}
          />
        )}
        {screen === "modeSelect" && (
          <ModeSelect
            playerName={playerName}
            onSinglePlayer={goSinglePlayer}
            onSinglePlayerAR={goSinglePlayerAR}
            onCreateRoom={goCreateRoom}
            onJoinRoom={goJoinRoom}
            onBack={goToNameScreen}
          />
        )}
        {screen === "characterSelect" && (
          <CharacterSelect
            onSelect={(idx) => goToGameWithCharacter(idx)}
            onBack={goBackFromCharacterSelect}
          />
        )}
        {screen === "joinRoom" && (
          <JoinRoom
            onJoin={handleJoinRoom}
            onBack={() => setScreen("modeSelect")}
          />
        )}
        {screen === "arHowToPlay" && (
          <ARHowToPlay onPlay={goToARScreen} onBack={() => setScreen("modeSelect")} />
        )}
        {screen === "game" && (
          <GameRun
            onDeath={handleDeath}
            characterIndex={characterIndex}
          />
        )}
        {screen === "death" && (
          <Death
            playerName={playerName}
            timeSurvived={lastScore}
            onRetry={handleRetry}
            onModeSelect={goToModeSelect}
            onViewLeaderboard={goToLeaderboard}
          />
        )}
        {screen === "results" && (
          <Results
            players={players}
            onRematch={handleRematch}
            onNewMatch={goHome}
            onViewLeaderboard={goToLeaderboard}
          />
        )}
        {screen === "ar" && (
          <ARScreen
            playerName={playerName}
            roomCode={roomCode}
            singlePlayerAR={!roomCode}
            onBack={goHome}
            onViewLeaderboard={goToLeaderboard}
          />
        )}
        {screen === "leaderboard" && (
          <Leaderboard onBack={goHome} currentPlayerName={playerName} />
        )}
        </div>
        </DesktopGate>
      </div>
    </AudioProvider>
  )
}

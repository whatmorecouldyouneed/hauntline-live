import { useState, useCallback } from "react"
import { DesktopGate } from "./app/screens/DesktopGate"
import { Home } from "./app/screens/Home"
import { NameInput } from "./app/screens/NameInput"
import { ModeSelect } from "./app/screens/ModeSelect"
import { CharacterSelect } from "./app/screens/CharacterSelect"
import { JoinRoom } from "./app/screens/JoinRoom"
import { GameRun } from "./app/screens/GameRun"
import { Death } from "./app/screens/Death"
import { Results } from "./app/screens/Results"
import { ARScreen } from "./app/screens/ARScreen"
import type { Player } from "./types/game"
import type { CharacterIndex } from "./game/meshes"
import "./App.css"

// TODO: online room state sync via PartyKit

type Screen =
  | "home"
  | "name"
  | "modeSelect"
  | "characterSelect"
  | "game"
  | "death"
  | "joinRoom"
  | "ar"
  | "results"

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

  return (
    <DesktopGate>
      <div className="app">
        {screen === "home" && (
          <Home onPlay={goName} />
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
            onHome={goHome}
          />
        )}
        {screen === "results" && (
          <Results
            players={players}
            onRematch={handleRematch}
            onNewMatch={goHome}
          />
        )}
        {screen === "ar" && (
          <ARScreen
            playerName={playerName}
            roomCode={roomCode}
            singlePlayerAR={!roomCode}
            onBack={goHome}
          />
        )}
      </div>
    </DesktopGate>
  )
}
